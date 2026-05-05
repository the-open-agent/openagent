// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package tool

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/creack/pty"
)

const (
	shellDefaultTimeoutSeconds = 30.0
	shellMaxTimeoutSeconds     = 300.0
	shellDefaultPollBytes      = 12000
	shellMaxPollBytes          = 100000
	shellDefaultPTYRows        = 40
	shellDefaultPTYCols        = 120
)

// ShellTool is the Tool Type "shell".
type ShellTool struct{}

func (p *ShellTool) BuiltinTools() []BuiltinTool {
	return []BuiltinTool{&shellBuiltin{}}
}

type shellBuiltin struct{}

type shellSession struct {
	id        string
	command   string
	workdir   string
	usePTY    bool
	cmd       *exec.Cmd
	stdin     io.WriteCloser
	ptyFile   *os.File
	output    *shellRingBuffer
	done      chan struct{}
	cancel    context.CancelFunc
	startedAt time.Time
	exitErr   error
	exitCode  *int

	mu     sync.Mutex
	closed bool
}

type shellRingBuffer struct {
	mu        sync.Mutex
	buf       []byte
	readPos   int
	maxBytes  int
	truncated bool
}

type shellSessionManager struct {
	mu       sync.Mutex
	sessions map[string]*shellSession
	nextID   uint64
}

var globalShellSessionManager = &shellSessionManager{
	sessions: map[string]*shellSession{},
}

func (s *shellBuiltin) GetName() string {
	return "shell"
}

func (s *shellBuiltin) GetDescription() string {
	return `Execute a shell command or manage a running shell process session.
- command (required): the shell command to run (e.g. "ls -la", "echo hello").
- timeout: execution timeout in seconds (default 30, max 300).
- workdir: working directory for the command (default: current directory).
- background: when true, start a long-running shell session and return a session_id immediately.
- pty: when true, run the command in a pseudo-terminal for interactive CLI programs.
- action: session lifecycle action. One of "start", "poll", "write", "submit", "send_keys", "resize", or "stop".
- session_id: required for process actions after start.
- input: text to write to the running terminal for "write" or "submit".
- keys: key sequence names for "send_keys", for example ["enter"], ["ctrl+c"], ["tab"].
- rows: terminal row count for PTY resize or PTY start.
- cols: terminal column count for PTY resize or PTY start.
- bytes: max bytes to return for "poll" (default 12000, max 100000).`
}

func (s *shellBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"command": map[string]interface{}{
				"type":        "string",
				"description": "The shell command to execute.",
			},
			"timeout": map[string]interface{}{
				"type":        "number",
				"description": "Execution timeout in seconds (default 30, max 300).",
			},
			"workdir": map[string]interface{}{
				"type":        "string",
				"description": "Working directory for the command (default: current directory).",
			},
			"background": map[string]interface{}{
				"type":        "boolean",
				"description": "When true, start a background shell session and return immediately.",
			},
			"pty": map[string]interface{}{
				"type":        "boolean",
				"description": "When true, allocate a pseudo-terminal for interactive CLI programs.",
			},
			"action": map[string]interface{}{
				"type":        "string",
				"enum":        []string{"start", "poll", "write", "submit", "send_keys", "resize", "stop"},
				"description": "Action for background shell process sessions. Defaults to start.",
			},
			"session_id": map[string]interface{}{
				"type":        "string",
				"description": "Session ID for background shell control actions.",
			},
			"input": map[string]interface{}{
				"type":        "string",
				"description": "Text to write to a background shell session.",
			},
			"bytes": map[string]interface{}{
				"type":        "number",
				"description": "Max bytes to return for poll (default 12000, max 100000).",
			},
			"keys": map[string]interface{}{
				"type":        "array",
				"description": "Key sequence names for send_keys, e.g. [\"enter\"], [\"ctrl+c\"].",
				"items": map[string]interface{}{
					"type": "string",
				},
			},
			"rows": map[string]interface{}{
				"type":        "number",
				"description": "PTY rows for start or resize.",
			},
			"cols": map[string]interface{}{
				"type":        "number",
				"description": "PTY columns for start or resize.",
			},
		},
	}
}

func (s *shellBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	if shellBoolArg(arguments, "background") || shellHasAction(arguments) {
		return shellExecuteBackground(ctx, arguments)
	}

	command, ok := arguments["command"].(string)
	if !ok || strings.TrimSpace(command) == "" {
		return shellError("Missing required parameter: command"), nil
	}

	timeoutSecs := shellDefaultTimeoutSeconds
	if t, ok := arguments["timeout"].(float64); ok && t > 0 {
		timeoutSecs = t
		if timeoutSecs > shellMaxTimeoutSeconds {
			timeoutSecs = shellMaxTimeoutSeconds
		}
	}

	workdir := shellStringArg(arguments, "workdir", "")
	usePTY := shellBoolArg(arguments, "pty")

	execCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSecs)*time.Second)
	defer cancel()

	cmd, err := shellBuildCommand(execCtx, command)
	if err != nil {
		return shellError(err.Error()), nil
	}
	if workdir != "" {
		cmd.Dir = workdir
	}

	result, runErr := shellRunForeground(execCtx, cmd, usePTY)
	if execCtx.Err() == context.DeadlineExceeded {
		return shellError(fmt.Sprintf("Error: command timed out after %.0f seconds", timeoutSecs)), nil
	}
	if runErr != nil {
		return shellError(result), nil
	}
	return shellText(result), nil
}

func shellExecuteBackground(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	action := shellStringArg(arguments, "action", "start")
	switch action {
	case "start":
		return shellStartBackground(ctx, arguments)
	case "poll":
		return shellPollBackground(arguments)
	case "write":
		return shellWriteBackground(arguments)
	case "submit":
		return shellSubmitBackground(arguments)
	case "send_keys":
		return shellSendKeysBackground(arguments)
	case "resize":
		return shellResizeBackground(arguments)
	case "stop":
		return shellStopBackground(arguments)
	default:
		return shellError(fmt.Sprintf("invalid action: %s", action)), nil
	}
}

func shellStartBackground(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	command := shellStringArg(arguments, "command", "")
	if command == "" {
		return shellError("Missing required parameter: command"), nil
	}

	workdir := shellStringArg(arguments, "workdir", "")
	usePTY := shellBoolArg(arguments, "pty")

	sessionCtx, cancel := context.WithCancel(ctx)
	cmd, err := shellBuildCommand(sessionCtx, command)
	if err != nil {
		cancel()
		return shellError(err.Error()), nil
	}
	if workdir != "" {
		cmd.Dir = workdir
	}

	session := &shellSession{
		id:        globalShellSessionManager.nextSessionID(),
		command:   command,
		workdir:   workdir,
		usePTY:    usePTY,
		cmd:       cmd,
		output:    newShellRingBuffer(shellMaxPollBytes * 2),
		done:      make(chan struct{}),
		cancel:    cancel,
		startedAt: time.Now(),
	}

	if usePTY {
		if runtime.GOOS == "windows" {
			cancel()
			return shellError("pty mode is not supported on Windows in the current shell implementation"), nil
		}

		cmd.Env = shellCommandEnv(true)
		ptmx, startErr := pty.Start(cmd)
		if startErr != nil {
			cancel()
			return shellError(startErr.Error()), nil
		}
		if sizeErr := shellSetPTYSize(ptmx, shellPTYCols(arguments), shellPTYRows(arguments)); sizeErr != nil {
			_ = ptmx.Close()
			cancel()
			return shellError(sizeErr.Error()), nil
		}
		session.stdin = ptmx
		session.ptyFile = ptmx
		go session.capture(ptmx)
	} else {
		stdin, pipeErr := cmd.StdinPipe()
		if pipeErr != nil {
			cancel()
			return shellError(pipeErr.Error()), nil
		}
		stdoutPipe, pipeErr := cmd.StdoutPipe()
		if pipeErr != nil {
			cancel()
			_ = stdin.Close()
			return shellError(pipeErr.Error()), nil
		}
		stderrPipe, pipeErr := cmd.StderrPipe()
		if pipeErr != nil {
			cancel()
			_ = stdin.Close()
			_ = stdoutPipe.Close()
			return shellError(pipeErr.Error()), nil
		}

		if pipeErr = cmd.Start(); pipeErr != nil {
			cancel()
			_ = stdin.Close()
			_ = stdoutPipe.Close()
			_ = stderrPipe.Close()
			return shellError(pipeErr.Error()), nil
		}

		session.stdin = stdin
		go session.capture(stdoutPipe)
		go session.capture(stderrPipe)
	}

	go session.wait()

	globalShellSessionManager.put(session)

	return shellJSON(map[string]interface{}{
		"session_id": session.id,
		"running":    true,
		"pid":        session.processID(),
		"command":    session.command,
		"workdir":    session.workdir,
		"pty":        session.usePTY,
		"started_at": session.startedAt.Format(time.RFC3339),
		"message":    "Background shell session started. Use action=poll to read output, action=write to send input, and action=stop to terminate it.",
	}), nil
}

func shellPollBackground(arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	sessionID := shellStringArg(arguments, "session_id", "")
	if sessionID == "" {
		return shellError("Missing required parameter: session_id"), nil
	}

	session := globalShellSessionManager.get(sessionID)
	if session == nil {
		return shellError(fmt.Sprintf("shell session not found: %s", sessionID)), nil
	}

	maxBytes := shellIntArg(arguments, "bytes", shellDefaultPollBytes)
	if maxBytes <= 0 {
		maxBytes = shellDefaultPollBytes
	}
	if maxBytes > shellMaxPollBytes {
		maxBytes = shellMaxPollBytes
	}

	output, truncated := session.output.readUnread(maxBytes)
	running := session.isRunning()
	payload := map[string]interface{}{
		"session_id":       session.id,
		"running":          running,
		"pid":              session.processID(),
		"command":          session.command,
		"workdir":          session.workdir,
		"pty":              session.usePTY,
		"output":           output,
		"output_truncated": truncated,
		"started_at":       session.startedAt.Format(time.RFC3339),
		"exit_code":        session.exitCodeValue(),
		"exit_error":       session.exitErrorText(),
	}

	if !running {
		globalShellSessionManager.delete(session.id)
	}

	return shellJSON(payload), nil
}

func shellWriteBackground(arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	sessionID := shellStringArg(arguments, "session_id", "")
	if sessionID == "" {
		return shellError("Missing required parameter: session_id"), nil
	}
	session := globalShellSessionManager.get(sessionID)
	if session == nil {
		return shellError(fmt.Sprintf("shell session not found: %s", sessionID)), nil
	}
	if !session.isRunning() {
		return shellError("shell session is no longer running"), nil
	}

	input := shellStringArg(arguments, "input", "")
	if input == "" {
		return shellError("Missing required parameter: input"), nil
	}

	n, err := io.WriteString(session.stdin, input)
	if err != nil {
		return shellError(err.Error()), nil
	}

	return shellJSON(map[string]interface{}{
		"session_id":    session.id,
		"written_bytes": n,
		"message":       "Input written to shell session.",
	}), nil
}

func shellSubmitBackground(arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	input := shellStringArg(arguments, "input", "")
	if input == "" {
		return shellWriteBackground(map[string]interface{}{
			"session_id": arguments["session_id"],
			"input":      "\n",
		})
	}
	return shellWriteBackground(map[string]interface{}{
		"session_id": arguments["session_id"],
		"input":      input + "\n",
	})
}

func shellSendKeysBackground(arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	sessionID := shellStringArg(arguments, "session_id", "")
	if sessionID == "" {
		return shellError("Missing required parameter: session_id"), nil
	}
	session := globalShellSessionManager.get(sessionID)
	if session == nil {
		return shellError(fmt.Sprintf("shell session not found: %s", sessionID)), nil
	}
	if !session.isRunning() {
		return shellError("shell session is no longer running"), nil
	}

	keys := shellStringSliceArg(arguments, "keys")
	if len(keys) == 0 {
		return shellError("Missing required parameter: keys"), nil
	}

	var seq strings.Builder
	for _, key := range keys {
		part, err := shellKeySequence(key)
		if err != nil {
			return shellError(err.Error()), nil
		}
		seq.WriteString(part)
	}

	n, err := io.WriteString(session.stdin, seq.String())
	if err != nil {
		return shellError(err.Error()), nil
	}

	return shellJSON(map[string]interface{}{
		"session_id":    session.id,
		"written_bytes": n,
		"message":       "Key sequence written to shell session.",
	}), nil
}

func shellResizeBackground(arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	sessionID := shellStringArg(arguments, "session_id", "")
	if sessionID == "" {
		return shellError("Missing required parameter: session_id"), nil
	}
	session := globalShellSessionManager.get(sessionID)
	if session == nil {
		return shellError(fmt.Sprintf("shell session not found: %s", sessionID)), nil
	}
	if !session.usePTY || session.ptyFile == nil {
		return shellError("shell session is not running in pty mode"), nil
	}

	cols := shellPTYCols(arguments)
	rows := shellPTYRows(arguments)
	if err := shellSetPTYSize(session.ptyFile, cols, rows); err != nil {
		return shellError(err.Error()), nil
	}

	return shellJSON(map[string]interface{}{
		"session_id": session.id,
		"pty":        true,
		"cols":       cols,
		"rows":       rows,
		"message":    "Shell PTY resized.",
	}), nil
}

func shellStopBackground(arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	sessionID := shellStringArg(arguments, "session_id", "")
	if sessionID == "" {
		return shellError("Missing required parameter: session_id"), nil
	}
	session := globalShellSessionManager.get(sessionID)
	if session == nil {
		return shellError(fmt.Sprintf("shell session not found: %s", sessionID)), nil
	}

	session.stop()
	globalShellSessionManager.delete(session.id)

	return shellJSON(map[string]interface{}{
		"session_id": session.id,
		"stopped":    true,
		"running":    false,
		"message":    "Shell session stopped.",
	}), nil
}

func shellBuildCommand(ctx context.Context, command string) (*exec.Cmd, error) {
	if runtime.GOOS == "windows" {
		return exec.CommandContext(ctx, "cmd", "/C", command), nil
	}
	cmd := exec.CommandContext(ctx, "sh", "-c", command)
	cmd.Env = shellCommandEnv(false)
	return cmd, nil
}

func shellRunForeground(ctx context.Context, cmd *exec.Cmd, usePTY bool) (string, error) {
	if !usePTY {
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		runErr := cmd.Run()
		stdoutStr := stdout.String()
		stderrStr := stderr.String()

		if runErr != nil {
			var parts []string
			parts = append(parts, fmt.Sprintf("Error: %s", runErr.Error()))
			if stderrStr != "" {
				parts = append(parts, fmt.Sprintf("Stderr:\n%s", stderrStr))
			}
			if stdoutStr != "" {
				parts = append(parts, fmt.Sprintf("Stdout:\n%s", stdoutStr))
			}
			return strings.Join(parts, "\n"), runErr
		}

		result := stdoutStr
		if stderrStr != "" {
			if result != "" {
				result = fmt.Sprintf("%s\nStderr:\n%s", result, stderrStr)
			} else {
				result = fmt.Sprintf("Stderr:\n%s", stderrStr)
			}
		}
		if result == "" {
			result = "(no output)"
		}
		return result, nil
	}

	if runtime.GOOS == "windows" {
		err := fmt.Errorf("pty mode is not supported on Windows in the current shell implementation")
		return err.Error(), err
	}

	cmd.Env = shellCommandEnv(true)
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return fmt.Sprintf("Error: %s", err.Error()), err
	}
	if sizeErr := shellSetPTYSize(ptmx, shellDefaultPTYCols, shellDefaultPTYRows); sizeErr != nil {
		_ = ptmx.Close()
		return fmt.Sprintf("Error: %s", sizeErr.Error()), sizeErr
	}

	var output bytes.Buffer
	copyDone := make(chan error, 1)
	go func() {
		_, copyErr := io.Copy(&output, ptmx)
		if copyErr != nil && !errors.Is(copyErr, os.ErrClosed) {
			copyDone <- copyErr
			return
		}
		copyDone <- nil
	}()

	runErr := cmd.Wait()
	_ = ptmx.Close()
	copyErr := <-copyDone

	if ctx.Err() == context.DeadlineExceeded {
		return "", ctx.Err()
	}
	if copyErr != nil && runErr == nil {
		runErr = copyErr
	}

	text := output.String()
	if text == "" {
		text = "(no output)"
	}
	if runErr != nil {
		return fmt.Sprintf("Error: %s\nOutput:\n%s", runErr.Error(), text), runErr
	}
	return text, nil
}

func shellStringArg(arguments map[string]interface{}, key string, defaultValue string) string {
	value, ok := arguments[key].(string)
	if !ok {
		return defaultValue
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return defaultValue
	}
	return value
}

func shellBoolArg(arguments map[string]interface{}, key string) bool {
	value, ok := arguments[key].(bool)
	return ok && value
}

func shellIntArg(arguments map[string]interface{}, key string, defaultValue int) int {
	value, ok := arguments[key]
	if !ok {
		return defaultValue
	}
	switch v := value.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return defaultValue
	}
}

func shellHasAction(arguments map[string]interface{}) bool {
	action, ok := arguments["action"].(string)
	if !ok {
		return false
	}
	switch strings.TrimSpace(action) {
	case "start", "poll", "write", "submit", "send_keys", "resize", "stop":
		return true
	default:
		return false
	}
}

func shellStringSliceArg(arguments map[string]interface{}, key string) []string {
	value, ok := arguments[key]
	if !ok {
		return nil
	}

	raw, ok := value.([]interface{})
	if !ok {
		return nil
	}

	result := make([]string, 0, len(raw))
	for _, item := range raw {
		text, ok := item.(string)
		if !ok {
			continue
		}
		text = strings.TrimSpace(text)
		if text == "" {
			continue
		}
		result = append(result, text)
	}
	return result
}

func shellPTYRows(arguments map[string]interface{}) uint16 {
	rows := shellIntArg(arguments, "rows", shellDefaultPTYRows)
	if rows <= 0 {
		rows = shellDefaultPTYRows
	}
	return uint16(rows)
}

func shellPTYCols(arguments map[string]interface{}) uint16 {
	cols := shellIntArg(arguments, "cols", shellDefaultPTYCols)
	if cols <= 0 {
		cols = shellDefaultPTYCols
	}
	return uint16(cols)
}

func shellCommandEnv(usePTY bool) []string {
	env := os.Environ()
	if usePTY {
		// This shell tool is optimized for reliable backend command execution rather
		// than rich terminal rendering. Keep PTY sessions in a plain terminal mode so
		// interactive CLIs are less likely to block on advanced terminal probing.
		env = shellEnsureEnv(env, "TERM", "dumb")
		env = shellEnsureEnv(env, "NO_COLOR", "1")
		env = shellEnsureEnv(env, "CLICOLOR", "0")
		env = shellEnsureEnv(env, "COLORTERM", "")
		env = shellEnsureEnv(env, "TERM_PROGRAM", "")
		env = shellEnsureEnv(env, "TERMINAL_EMULATOR", "")
		env = shellEnsureEnv(env, "PAGER", "cat")
	}
	return env
}

func shellEnsureEnv(env []string, key string, value string) []string {
	prefix := key + "="
	for i, entry := range env {
		if strings.HasPrefix(entry, prefix) {
			env[i] = prefix + value
			return env
		}
	}
	return append(env, prefix+value)
}

func shellSetPTYSize(file *os.File, cols uint16, rows uint16) error {
	if file == nil {
		return fmt.Errorf("pty is not available for this shell session")
	}
	return pty.Setsize(file, &pty.Winsize{
		Cols: cols,
		Rows: rows,
	})
}

func shellKeySequence(key string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "enter", "return":
		return "\n", nil
	case "tab":
		return "\t", nil
	case "backspace":
		return "\b", nil
	case "escape", "esc":
		return "\x1b", nil
	case "space":
		return " ", nil
	case "ctrl+c":
		return "\x03", nil
	case "ctrl+d":
		return "\x04", nil
	case "ctrl+z":
		return "\x1a", nil
	case "up":
		return "\x1b[A", nil
	case "down":
		return "\x1b[B", nil
	case "right":
		return "\x1b[C", nil
	case "left":
		return "\x1b[D", nil
	default:
		return "", fmt.Errorf("unsupported key sequence: %s", key)
	}
}

func shellText(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: false,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}

func shellError(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: true,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}

func shellJSON(v interface{}) *protocol.CallToolResult {
	bs, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return shellError(err.Error())
	}
	return &protocol.CallToolResult{
		IsError: false,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: string(bs)},
		},
	}
}

func newShellRingBuffer(maxBytes int) *shellRingBuffer {
	return &shellRingBuffer{
		buf:      make([]byte, 0, maxBytes),
		maxBytes: maxBytes,
	}
}

func (b *shellRingBuffer) write(chunk []byte) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.buf = append(b.buf, chunk...)
	if len(b.buf) <= b.maxBytes {
		return
	}

	overflow := len(b.buf) - b.maxBytes
	b.buf = append([]byte{}, b.buf[overflow:]...)
	b.truncated = true
	if b.readPos >= overflow {
		b.readPos -= overflow
	} else {
		b.readPos = 0
	}
}

func (b *shellRingBuffer) readUnread(limit int) (string, bool) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.readPos >= len(b.buf) {
		return "", false
	}
	end := len(b.buf)
	truncated := false
	if limit > 0 && b.readPos+limit < end {
		end = b.readPos + limit
		truncated = true
	}
	text := string(b.buf[b.readPos:end])
	b.readPos = end
	return text, truncated || b.truncated
}

func (s *shellSession) capture(r io.Reader) {
	buffer := make([]byte, 4096)
	for {
		n, err := r.Read(buffer)
		if n > 0 {
			s.output.write(buffer[:n])
		}
		if err != nil {
			return
		}
	}
}

func (s *shellSession) wait() {
	defer close(s.done)
	s.exitErr = s.cmd.Wait()
	if s.cmd.ProcessState != nil {
		code := s.cmd.ProcessState.ExitCode()
		s.exitCode = &code
	}
	s.closeInput()
}

func (s *shellSession) isRunning() bool {
	select {
	case <-s.done:
		return false
	default:
		return true
	}
}

func (s *shellSession) processID() int {
	if s.cmd == nil || s.cmd.Process == nil {
		return 0
	}
	return s.cmd.Process.Pid
}

func (s *shellSession) exitCodeValue() interface{} {
	if s.exitCode == nil {
		return nil
	}
	return *s.exitCode
}

func (s *shellSession) exitErrorText() interface{} {
	if s.exitErr == nil {
		return nil
	}
	return s.exitErr.Error()
}

func (s *shellSession) stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return
	}
	s.closed = true

	if s.cancel != nil {
		s.cancel()
	}
	s.closeInputLocked()
	if s.cmd != nil && s.cmd.Process != nil {
		if runtime.GOOS == "windows" {
			_ = s.cmd.Process.Kill()
		} else {
			_ = s.cmd.Process.Signal(syscall.SIGTERM)
			select {
			case <-s.done:
			case <-time.After(2 * time.Second):
				_ = s.cmd.Process.Kill()
			}
		}
	}
}

func (s *shellSession) closeInput() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.closeInputLocked()
}

func (s *shellSession) closeInputLocked() {
	if s.stdin != nil {
		_ = s.stdin.Close()
		s.stdin = nil
	}
	s.ptyFile = nil
}

func (m *shellSessionManager) nextSessionID() string {
	id := atomic.AddUint64(&m.nextID, 1)
	return "shell-" + strconv.FormatUint(id, 10)
}

func (m *shellSessionManager) put(session *shellSession) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[session.id] = session
}

func (m *shellSessionManager) get(id string) *shellSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.sessions[id]
}

func (m *shellSessionManager) delete(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, id)
}
