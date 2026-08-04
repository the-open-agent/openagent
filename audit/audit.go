// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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

// Package audit writes a structured, append-only JSONL activity log - one
// self-contained event per line - so an external tool can tail OpenAgent's tool
// activity read-only, without reading the database. It is a pure additional
// sink: a failure here never blocks or fails the operation being audited.
//
// The log lives next to the binary (the same directory strategy the SQLite
// database uses), overridable with OPENAGENT_AUDIT_DIR. One file per session,
// so a reader can use the file name as the session key and never has to
// untangle interleaved sessions.
package audit

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const timeFormat = "2006-01-02T15:04:05.000Z07:00"

// Event is one audit line. Fields are omitted when empty so the format stays
// small and forward-compatible: a reader ignores fields it does not know.
type Event struct {
	Timestamp       string `json:"timestamp"`
	SessionID       string `json:"sessionId,omitempty"`
	Type            string `json:"type"`
	Tool            string `json:"tool,omitempty"`
	Server          string `json:"server,omitempty"`
	Model           string `json:"model,omitempty"`
	ArgumentsLength int    `json:"argumentsLength,omitempty"`
	Outcome         string `json:"outcome,omitempty"`
	DurationMs      int64  `json:"durationMs,omitempty"`
	// Effect, Reason and Rule carry the guard verdict once the guard is wired
	// into the tool path; empty until then.
	Effect string `json:"effect,omitempty"`
	Reason string `json:"reason,omitempty"`
	Rule   string `json:"rule,omitempty"`
}

// queueSize bounds how many events may be waiting to be written. It is generous
// because each event is tiny; if it is ever exceeded, events are dropped rather
// than allowed to block a tool call.
const queueSize = 4096

// queued is one unit of work for the background writer. A marker carries only
// done (line nil) and lets flush wait until everything before it is written.
type queued struct {
	line    []byte
	session string
	done    chan struct{}
}

var (
	queue     chan queued
	startOnce sync.Once
)

// Record appends one event to its session's audit file. It is best-effort and
// non-blocking: the event is handed to a background writer, so a slow or stalled
// audit directory (for example an OPENAGENT_AUDIT_DIR on a network mount) can
// never slow down or fail the tool call it is recording. If the writer cannot
// keep up, events are dropped rather than allowed to block.
func Record(event Event) {
	if event.Type == "" {
		return
	}
	event.Timestamp = time.Now().UTC().Format(timeFormat)

	line, err := json.Marshal(event)
	if err != nil {
		return
	}

	startOnce.Do(startWriter)
	select {
	case queue <- queued{line: append(line, '\n'), session: sanitizeSession(event.SessionID)}:
	default:
		// Queue full: drop rather than block. Auditing is a sidecar and must
		// never hold up the operation it records.
	}
}

func startWriter() {
	queue = make(chan queued, queueSize)
	go func() {
		for item := range queue {
			if item.line != nil {
				writeLine(item.session, item.line)
			}
			if item.done != nil {
				close(item.done)
			}
		}
	}()
}

// writeLine performs the actual disk append, off the caller's goroutine. Every
// failure is swallowed: auditing must never take down what it records.
func writeLine(session string, line []byte) {
	dir := auditDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return
	}
	file, err := os.OpenFile(filepath.Join(dir, session+".jsonl"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	defer file.Close()
	_, _ = file.Write(line)
}

// flush blocks until every event queued before it has been written. It exists
// for tests and for a future graceful shutdown; the single background writer
// processes work in order, so the marker cannot pass earlier events.
func flush() {
	startOnce.Do(startWriter)
	done := make(chan struct{})
	queue <- queued{done: done}
	<-done
}

// auditDir is <dir-of-binary>/audit, mirroring how the SQLite database is placed
// next to the binary, unless OPENAGENT_AUDIT_DIR overrides it. The binary path
// is resolved through any symlink first: os.Executable() returns the path used
// to invoke the process, which is the symlink itself when OpenAgent is started
// through one (e.g. a package manager's ~/.local/bin/openagent link) rather
// than the real binary it points at. An external reader has no reason to know
// about that symlink - it locates the audit directory the same way aiguard's
// agentmonitor.ResolveOpenAgentAuditDir does, by resolving the binary path it
// found first - so this must resolve it too, or the two disagree on where the
// directory is and every event silently lands somewhere nobody reads.
func auditDir() string {
	if override := strings.TrimSpace(os.Getenv("OPENAGENT_AUDIT_DIR")); override != "" {
		return override
	}
	exe, err := os.Executable()
	if err != nil {
		return "audit"
	}
	return auditDirFor(exe)
}

// auditDirFor is the symlink-resolving half of auditDir, split out so a test
// can exercise it against a path it controls instead of the real executable.
func auditDirFor(exe string) string {
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	return filepath.Join(filepath.Dir(exe), "audit")
}

// sanitizeSession keeps a session id safe to use as a file name, and falls back
// to a fixed name when no session is known so events are never dropped.
func sanitizeSession(session string) string {
	session = strings.TrimSpace(session)
	cleaned := strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			return r
		case r == '-', r == '_', r == '.':
			return r
		default:
			return '-'
		}
	}, session)
	cleaned = strings.Trim(cleaned, "-.")
	if cleaned == "" {
		return "openagent"
	}
	return cleaned
}
