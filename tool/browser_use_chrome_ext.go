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
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/chromedp/cdproto/target"
	"github.com/gorilla/websocket"
)

const (
	browserUseModeChromeExt       = "OpenAgent Chrome Extension"
	browserUseChromeExtBridgePath = "/api/chrome-connect"
	browserUseChromeExtTimeout    = 45 * time.Second
)

type browserUseChromeExtBridge struct {
	mu         sync.Mutex
	writeMu    sync.Mutex
	conn       *websocket.Conn
	name       string
	version    string
	pending    map[string]chan browserUseChromeExtResponse
	requestSeq uint64
}

type browserUseChromeExtMessage struct {
	Type    string          `json:"type"`
	ID      string          `json:"id,omitempty"`
	Command string          `json:"command,omitempty"`
	Name    string          `json:"name,omitempty"`
	Version string          `json:"version,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Result  json.RawMessage `json:"result,omitempty"`
	OK      *bool           `json:"ok,omitempty"`
	Error   string          `json:"error,omitempty"`
}

type browserUseChromeExtCallMessage struct {
	Type    string      `json:"type"`
	ID      string      `json:"id"`
	Command string      `json:"command"`
	Payload interface{} `json:"payload,omitempty"`
}

type browserUseChromeExtResponse struct {
	result json.RawMessage
	err    error
}

type browserUseChromeExtTab struct {
	ID         int    `json:"id"`
	WindowID   int    `json:"windowId"`
	Index      int    `json:"index"`
	Title      string `json:"title"`
	URL        string `json:"url"`
	Active     bool   `json:"active"`
	Controlled bool   `json:"controlled"`
	Protected  bool   `json:"protected"`
}

type browserUseChromeExtTabsResult struct {
	Tabs []browserUseChromeExtTab `json:"tabs"`
}

type browserUseChromeExtSnapshotResult struct {
	Tab         browserUseChromeExtTab `json:"tab"`
	URL         string                 `json:"url"`
	Title       string                 `json:"title"`
	VisibleText string                 `json:"visibleText"`
	MediaState  string                 `json:"mediaState"`
	ScrollX     float64                `json:"scrollX"`
	ScrollY     float64                `json:"scrollY"`
	Elements    []browserUseElement    `json:"elements"`
}

type browserUseChromeExtState struct {
	Mode            string                 `json:"mode"`
	Connected       bool                   `json:"connected"`
	Name            string                 `json:"name"`
	Version         string                 `json:"version"`
	Tab             browserUseChromeExtTab `json:"tab"`
	TabCount        int                    `json:"tabCount"`
	ControlledIndex int                    `json:"controlledIndex"`
	MediaState      string                 `json:"mediaState"`
}

var globalBrowserUseChromeExtBridge = &browserUseChromeExtBridge{
	pending: map[string]chan browserUseChromeExtResponse{},
}

func (p *BrowserUseTool) isChromeExtMode() bool {
	return p.mode == browserUseModeChromeExt
}

func HandleChromeConnectWebSocket(w http.ResponseWriter, r *http.Request) {
	globalBrowserUseChromeExtBridge.handleWebSocket(w, r)
}

func (b *browserUseChromeExtBridge) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	if !browserUseIsLocalRequest(r) {
		http.Error(w, "browser extension bridge only accepts localhost connections", http.StatusForbidden)
		return
	}
	if expectedToken := strings.TrimSpace(os.Getenv("OPENAGENT_CHROME_EXTENSION_TOKEN")); expectedToken != "" {
		if r.URL.Query().Get("token") != expectedToken {
			http.Error(w, "invalid browser extension bridge token", http.StatusUnauthorized)
			return
		}
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  8192,
		WriteBufferSize: 8192,
		CheckOrigin: func(r *http.Request) bool {
			return browserUseIsChromeExtensionOrigin(r.Header.Get("Origin"))
		},
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	b.attach(conn)
	defer b.detach(conn, fmt.Errorf("OpenAgent Chrome extension disconnected"))

	_ = b.writeJSON(conn, map[string]interface{}{
		"type":        "server_hello",
		"name":        "openagent",
		"version":     "2",
		"heartbeatMs": 20000,
	})

	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			return
		}
		var message browserUseChromeExtMessage
		if err = json.Unmarshal(data, &message); err != nil {
			continue
		}
		b.handleMessage(message)
	}
}

func (b *browserUseChromeExtBridge) attach(conn *websocket.Conn) {
	b.mu.Lock()
	oldConn := b.conn
	pending := b.pending
	if oldConn != nil && oldConn != conn {
		b.pending = map[string]chan browserUseChromeExtResponse{}
	}
	b.conn = conn
	b.name = ""
	b.version = ""
	defer b.mu.Unlock()

	if oldConn != nil && oldConn != conn {
		_ = oldConn.Close()
		for _, ch := range pending {
			ch <- browserUseChromeExtResponse{err: fmt.Errorf("OpenAgent Chrome extension reconnected before the command completed")}
		}
	}
}

func (b *browserUseChromeExtBridge) detach(conn *websocket.Conn, err error) {
	b.mu.Lock()
	if b.conn != conn {
		b.mu.Unlock()
		return
	}
	_ = conn.Close()
	b.conn = nil
	b.name = ""
	b.version = ""
	pending := b.pending
	b.pending = map[string]chan browserUseChromeExtResponse{}
	b.mu.Unlock()

	for _, ch := range pending {
		ch <- browserUseChromeExtResponse{err: err}
	}
}

func (b *browserUseChromeExtBridge) handleMessage(message browserUseChromeExtMessage) {
	switch message.Type {
	case "hello":
		b.mu.Lock()
		b.name = message.Name
		b.version = message.Version
		b.mu.Unlock()
	case "ping":
		b.mu.Lock()
		conn := b.conn
		b.mu.Unlock()
		if conn != nil {
			_ = b.writeJSON(conn, map[string]interface{}{
				"type": "pong",
				"ts":   time.Now().UnixMilli(),
			})
		}
	case "result":
		b.resolve(message.ID, message.Result, message.Error, message.OK)
	case "error":
		errText := message.Error
		if errText == "" {
			errText = "browser extension returned an error"
		}
		b.resolve(message.ID, nil, errText, nil)
	}
}

func (b *browserUseChromeExtBridge) resolve(id string, result json.RawMessage, errorText string, ok *bool) {
	if id == "" {
		return
	}
	b.mu.Lock()
	ch, okPending := b.pending[id]
	if okPending {
		delete(b.pending, id)
	}
	b.mu.Unlock()
	if !okPending {
		return
	}
	if ok != nil && !*ok && errorText == "" {
		errorText = "browser extension command failed"
	}
	if errorText != "" {
		ch <- browserUseChromeExtResponse{err: fmt.Errorf("%s", errorText)}
		return
	}
	ch <- browserUseChromeExtResponse{result: result}
}

func (b *browserUseChromeExtBridge) call(ctx context.Context, command string, payload interface{}) (json.RawMessage, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, browserUseChromeExtTimeout)
	defer cancel()

	id := strconv.FormatUint(atomic.AddUint64(&b.requestSeq, 1), 10)
	ch := make(chan browserUseChromeExtResponse, 1)

	b.mu.Lock()
	conn := b.conn
	if conn == nil {
		b.mu.Unlock()
		return nil, fmt.Errorf("OpenAgent Chrome extension is not connected. Install the OpenAgent Chrome extension, open the popup, enter http://127.0.0.1:14000, and click Connect")
	}
	b.pending[id] = ch
	b.mu.Unlock()

	if err := b.writeJSON(conn, browserUseChromeExtCallMessage{
		Type:    "call",
		ID:      id,
		Command: command,
		Payload: payload,
	}); err != nil {
		b.mu.Lock()
		delete(b.pending, id)
		b.mu.Unlock()
		return nil, err
	}

	select {
	case response := <-ch:
		return response.result, response.err
	case <-timeoutCtx.Done():
		b.mu.Lock()
		delete(b.pending, id)
		b.mu.Unlock()
		return nil, fmt.Errorf("browser extension command %q timed out", command)
	}
}

func (b *browserUseChromeExtBridge) writeJSON(conn *websocket.Conn, value interface{}) error {
	b.writeMu.Lock()
	defer b.writeMu.Unlock()
	return conn.WriteJSON(value)
}

func (b *browserUseChromeExtBridge) disconnect() {
	b.mu.Lock()
	conn := b.conn
	pending := b.pending
	b.conn = nil
	b.name = ""
	b.version = ""
	b.pending = map[string]chan browserUseChromeExtResponse{}
	b.mu.Unlock()

	if conn != nil {
		_ = conn.Close()
	}
	for _, ch := range pending {
		ch <- browserUseChromeExtResponse{err: fmt.Errorf("OpenAgent Chrome extension bridge closed")}
	}
}

func (b *browserUseChromeExtBridge) requestDisconnect(ctx context.Context) error {
	_, err := b.call(ctx, "disconnect", map[string]interface{}{})
	return err
}

func (b *browserUseChromeExtBridge) connectionInfo() (bool, string, string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.conn != nil, b.name, b.version
}

func browserUseIsLocalRequest(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return host == "localhost"
	}
	return ip.IsLoopback()
}

func browserUseIsChromeExtensionOrigin(origin string) bool {
	if strings.TrimSpace(origin) == "" {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return u.Scheme == "chrome-extension" && u.Host != "" && u.Path == "" && u.RawQuery == "" && u.Fragment == ""
}

func browserUseChromeExtCall(ctx context.Context, command string, payload interface{}, out interface{}) error {
	raw, err := globalBrowserUseChromeExtBridge.call(ctx, command, payload)
	if err != nil {
		return err
	}
	if out == nil {
		return nil
	}
	if len(raw) == 0 {
		return fmt.Errorf("browser extension returned an empty response for %s", command)
	}
	return json.Unmarshal(raw, out)
}

func browserUseChromeExtOpen(ctx context.Context, rawURL string) error {
	return browserUseChromeExtCall(ctx, "open", map[string]interface{}{"url": rawURL}, nil)
}

func browserUseChromeExtSnapshot(ctx context.Context) (string, error) {
	var snapshot browserUseChromeExtSnapshotResult
	if err := browserUseChromeExtCall(ctx, "snapshot", map[string]interface{}{}, &snapshot); err != nil {
		return "", err
	}
	if snapshot.URL == "" {
		snapshot.URL = snapshot.Tab.URL
	}
	if snapshot.Title == "" {
		snapshot.Title = snapshot.Tab.Title
	}
	return browserUseFormatSnapshot(snapshot.URL, snapshot.Title, snapshot.VisibleText, snapshot.ScrollX, snapshot.ScrollY, snapshot.Elements), nil
}

func browserUseChromeExtCurrentState(ctx context.Context) (string, error) {
	var state browserUseChromeExtState
	err := browserUseChromeExtCall(ctx, "state", map[string]interface{}{}, &state)
	if err != nil {
		connected, name, version := globalBrowserUseChromeExtBridge.connectionInfo()
		if !connected {
			return "", err
		}
		state = browserUseChromeExtState{
			Mode:      browserUseModeChromeExt,
			Connected: true,
			Name:      name,
			Version:   version,
		}
	}

	if strings.TrimSpace(state.Mode) == "" {
		state.Mode = browserUseModeChromeExt
	}
	if strings.TrimSpace(state.MediaState) == "" {
		state.MediaState = "none"
	}
	activeText := "unknown"
	if state.TabCount > 0 && state.ControlledIndex > 0 {
		activeText = fmt.Sprintf("%d/%d", state.ControlledIndex, state.TabCount)
	} else if state.TabCount > 0 {
		activeText = fmt.Sprintf("unknown/%d", state.TabCount)
	}

	var builder strings.Builder
	builder.WriteString("Current browser state:\n")
	builder.WriteString(fmt.Sprintf("- Mode: %s\n", state.Mode))
	builder.WriteString(fmt.Sprintf("- Controlled tab: %s\n", activeText))
	builder.WriteString(fmt.Sprintf("- Title: %s\n", strings.TrimSpace(state.Tab.Title)))
	builder.WriteString(fmt.Sprintf("- URL: %s\n", strings.TrimSpace(state.Tab.URL)))
	if state.Name != "" || state.Version != "" {
		builder.WriteString(fmt.Sprintf("- Extension: %s %s\n", strings.TrimSpace(state.Name), strings.TrimSpace(state.Version)))
	}
	builder.WriteString("- Media:\n")
	for _, line := range strings.Split(strings.TrimSpace(state.MediaState), "\n") {
		if strings.TrimSpace(line) != "" {
			builder.WriteString(fmt.Sprintf("  %s\n", strings.TrimSpace(line)))
		}
	}
	return builder.String(), nil
}

func browserUseChromeExtClick(ctx context.Context, arguments map[string]interface{}) error {
	payload, err := browserUseChromeExtTargetPayload(arguments)
	if err != nil {
		return err
	}
	return browserUseChromeExtCall(ctx, "click", payload, nil)
}

func browserUseChromeExtType(ctx context.Context, arguments map[string]interface{}) error {
	payload, err := browserUseChromeExtTargetPayload(arguments)
	if err != nil {
		return err
	}
	text, ok := arguments["text"].(string)
	if !ok {
		return fmt.Errorf("missing required parameter: text")
	}
	payload["text"] = text
	clear := true
	if value, ok := arguments["clear"].(bool); ok {
		clear = value
	}
	payload["clear"] = clear
	return browserUseChromeExtCall(ctx, "type", payload, nil)
}

func browserUseChromeExtPress(ctx context.Context, key string) error {
	return browserUseChromeExtCall(ctx, "press", map[string]interface{}{"key": key}, nil)
}

func browserUseChromeExtPlayMedia(ctx context.Context) (string, error) {
	var result struct {
		Text string `json:"text"`
	}
	if err := browserUseChromeExtCall(ctx, "playMedia", map[string]interface{}{}, &result); err != nil {
		return "", err
	}
	return result.Text, nil
}

func browserUseChromeExtTabs(ctx context.Context) ([]browserUseTab, error) {
	var result browserUseChromeExtTabsResult
	if err := browserUseChromeExtCall(ctx, "tabs", map[string]interface{}{}, &result); err != nil {
		return nil, err
	}
	return browserUseChromeExtTabsToBrowserUseTabs(result.Tabs), nil
}

func browserUseChromeExtSwitchTab(ctx context.Context, index int) error {
	var result browserUseChromeExtTabsResult
	if err := browserUseChromeExtCall(ctx, "tabs", map[string]interface{}{}, &result); err != nil {
		return err
	}
	if index > len(result.Tabs) {
		return fmt.Errorf("tab index %d is out of range; there are %d tabs", index, len(result.Tabs))
	}
	return browserUseChromeExtCall(ctx, "switchTab", map[string]interface{}{"tabId": result.Tabs[index-1].ID}, nil)
}

func browserUseChromeExtCloseTab(ctx context.Context, index int) error {
	var result browserUseChromeExtTabsResult
	if err := browserUseChromeExtCall(ctx, "tabs", map[string]interface{}{}, &result); err != nil {
		return err
	}
	if index > len(result.Tabs) {
		return fmt.Errorf("tab index %d is out of range; there are %d tabs", index, len(result.Tabs))
	}
	return browserUseChromeExtCall(ctx, "closeTab", map[string]interface{}{"tabId": result.Tabs[index-1].ID}, nil)
}

func browserUseChromeExtTargetPayload(arguments map[string]interface{}) (map[string]interface{}, error) {
	payload := map[string]interface{}{}
	if rawIndex, ok := arguments["index"]; ok {
		index, err := browserUsePositiveInt(rawIndex, "index")
		if err != nil {
			return nil, err
		}
		payload["index"] = index
		return payload, nil
	}
	if selector, ok := arguments["selector"].(string); ok && strings.TrimSpace(selector) != "" {
		payload["selector"] = strings.TrimSpace(selector)
		return payload, nil
	}
	return nil, fmt.Errorf("missing required parameter: index or selector")
}

// ---------------------------------------------------------------------------
// Chrome Connect builtin tools
// ---------------------------------------------------------------------------

func chromeConnectTextWithState(text string) *protocol.CallToolResult {
	state, err := browserUseChromeExtCurrentState(context.Background())
	if err != nil {
		return browserToolText(fmt.Sprintf("%s\n\nCurrent browser state: unavailable: %s", text, err.Error()))
	}
	return browserToolText(fmt.Sprintf("%s\n\n%s", text, state))
}

func chromeConnectErrorWithState(text string) *protocol.CallToolResult {
	state, err := browserUseChromeExtCurrentState(context.Background())
	if err != nil {
		return browserToolError(fmt.Sprintf("%s\n\nCurrent browser state: unavailable: %s", text, err.Error()))
	}
	return browserToolError(fmt.Sprintf("%s\n\n%s", text, state))
}

func chromeConnectBuiltinTools() []BuiltinTool {
	return []BuiltinTool{
		&chromeConnectOpenBuiltin{},
		&chromeConnectSnapshotBuiltin{},
		&chromeConnectClickBuiltin{},
		&chromeConnectTypeBuiltin{},
		&chromeConnectPressBuiltin{},
		&chromeConnectPlayMediaBuiltin{},
		&chromeConnectTabsBuiltin{},
		&chromeConnectSwitchTabBuiltin{},
		&chromeConnectCloseTabBuiltin{},
		&chromeConnectCloseBuiltin{},
	}
}

type chromeConnectOpenBuiltin struct{}

func (b *chromeConnectOpenBuiltin) GetName() string { return "browser_use_open" }
func (b *chromeConnectOpenBuiltin) GetDescription() string {
	return "Navigate the Browser Use controlled tab in your existing Chrome browser to a URL via the OpenAgent Chrome extension. OpenAgent UI tabs are protected and Browser Use operates a separate controlled tab. Use this for real browser tasks only; do not claim a page was opened unless this tool succeeds. Returns a fresh snapshot plus current browser state."
}

func (b *chromeConnectOpenBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL to open in the controlled tab.",
			},
		},
		"required": []string{"url"},
	}
}

func (b *chromeConnectOpenBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawURL, ok := arguments["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return browserToolError("missing required parameter: url"), nil
	}
	rawURL = strings.TrimSpace(rawURL)
	if err := browserUseChromeExtOpen(ctx, rawURL); err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use open failed for %s: %s", rawURL, err.Error())), nil
	}
	snapshot, err := browserUseChromeExtSnapshot(ctx)
	if err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use snapshot failed after opening %s: %s", rawURL, err.Error())), nil
	}
	return chromeConnectTextWithState(snapshot), nil
}

type chromeConnectSnapshotBuiltin struct{}

func (b *chromeConnectSnapshotBuiltin) GetName() string { return "browser_use_snapshot" }
func (b *chromeConnectSnapshotBuiltin) GetDescription() string {
	return "Read the Browser Use controlled tab in your existing Chrome browser via the OpenAgent Chrome extension and return visible text, indexed interactive elements, URL, title, controlled tab index, tab count, and media state. Treat this as the source of truth before acting. Use it at the start of a follow-up request and after every navigation, click, type, or key press before reusing element indexes."
}

func (b *chromeConnectSnapshotBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *chromeConnectSnapshotBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	snapshot, err := browserUseChromeExtSnapshot(ctx)
	if err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use snapshot failed: %s", err.Error())), nil
	}
	return chromeConnectTextWithState(snapshot), nil
}

type chromeConnectClickBuiltin struct{}

func (b *chromeConnectClickBuiltin) GetName() string { return "browser_use_click" }
func (b *chromeConnectClickBuiltin) GetDescription() string {
	return "Click an indexed element from the latest browser_use_snapshot, or a CSS selector when no index is available. The click may navigate, open a new tab, or change the DOM, so old indexes must be considered stale afterward. Call browser_use_snapshot before the next indexed action."
}

func (b *chromeConnectClickBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"index": map[string]interface{}{
				"type":        "integer",
				"description": "Element index from the latest browser_use_snapshot.",
			},
			"selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector. Use only when an index is not available.",
			},
		},
	}
}

func (b *chromeConnectClickBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	if err := browserUseChromeExtClick(ctx, arguments); err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use click failed: %s", err.Error())), nil
	}
	return chromeConnectTextWithState("Clicked. Call browser_use_snapshot before the next indexed action."), nil
}

type chromeConnectTypeBuiltin struct{}

func (b *chromeConnectTypeBuiltin) GetName() string { return "browser_use_type" }
func (b *chromeConnectTypeBuiltin) GetDescription() string {
	return "Type text into an indexed input-like element or a CSS selector from the latest browser_use_snapshot. Set clear=true to replace the current field content. Verify with browser_use_snapshot before relying on indexes or claiming the input was accepted."
}

func (b *chromeConnectTypeBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"index": map[string]interface{}{
				"type":        "integer",
				"description": "Element index from the latest browser_use_snapshot.",
			},
			"selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector. Use only when an index is not available.",
			},
			"text": map[string]interface{}{
				"type":        "string",
				"description": "Text to type.",
			},
			"clear": map[string]interface{}{
				"type":        "boolean",
				"description": "Whether to clear the current field value before typing.",
				"default":     true,
			},
		},
		"required": []string{"text"},
	}
}

func (b *chromeConnectTypeBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	if err := browserUseChromeExtType(ctx, arguments); err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use type failed: %s", err.Error())), nil
	}
	return chromeConnectTextWithState("Typed. Call browser_use_snapshot before the next indexed action or before claiming the page accepted the input."), nil
}

type chromeConnectPressBuiltin struct{}

func (b *chromeConnectPressBuiltin) GetName() string { return "browser_use_press" }
func (b *chromeConnectPressBuiltin) GetDescription() string {
	return "Press a keyboard key in the controlled Chrome tab, such as Enter, Tab, Escape, ArrowDown, or Space. A key press can submit a form, navigate, or change focus; call browser_use_snapshot before the next indexed action."
}

func (b *chromeConnectPressBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"key": map[string]interface{}{
				"type":        "string",
				"description": "Keyboard key to press, for example Enter, Tab, Escape, ArrowDown, or Space.",
			},
		},
		"required": []string{"key"},
	}
}

func (b *chromeConnectPressBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	key, ok := arguments["key"].(string)
	if !ok || strings.TrimSpace(key) == "" {
		return browserToolError("missing required parameter: key"), nil
	}
	if err := browserUseChromeExtPress(ctx, strings.TrimSpace(key)); err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use press failed for %s: %s", key, err.Error())), nil
	}
	return chromeConnectTextWithState("Key pressed. Call browser_use_snapshot before the next indexed action."), nil
}

type chromeConnectPlayMediaBuiltin struct{}

func (b *chromeConnectPlayMediaBuiltin) GetName() string { return "browser_use_play_media" }
func (b *chromeConnectPlayMediaBuiltin) GetDescription() string {
	return "Play and unmute visible audio or video elements on the Browser Use controlled tab via the OpenAgent Chrome extension. Use this after opening a page with media if playback is paused or muted."
}

func (b *chromeConnectPlayMediaBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *chromeConnectPlayMediaBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	result, err := browserUseChromeExtPlayMedia(ctx)
	if err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use play media failed: %s", err.Error())), nil
	}
	return chromeConnectTextWithState(result), nil
}

type chromeConnectTabsBuiltin struct{}

func (b *chromeConnectTabsBuiltin) GetName() string { return "browser_use_tabs" }
func (b *chromeConnectTabsBuiltin) GetDescription() string {
	return "List open Chrome tabs available via the OpenAgent Chrome extension, including active, controlled, and protected tab markers, titles, and URLs. Use this before switching tabs or when the current page does not match what the user sees."
}

func (b *chromeConnectTabsBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *chromeConnectTabsBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	tabs, err := browserUseChromeExtTabs(ctx)
	if err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use tabs failed: %s", err.Error())), nil
	}
	return chromeConnectTextWithState(browserUseFormatTabs(tabs)), nil
}

type chromeConnectSwitchTabBuiltin struct{}

func (b *chromeConnectSwitchTabBuiltin) GetName() string { return "browser_use_switch_tab" }
func (b *chromeConnectSwitchTabBuiltin) GetDescription() string {
	return "Switch Browser Use to a tab returned by browser_use_tabs via the OpenAgent Chrome extension. Protected OpenAgent UI tabs cannot be controlled. Returns a fresh snapshot and browser state for the selected tab."
}

func (b *chromeConnectSwitchTabBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"index": map[string]interface{}{
				"type":        "integer",
				"description": "Tab index returned by browser_use_tabs.",
			},
		},
		"required": []string{"index"},
	}
}

func (b *chromeConnectSwitchTabBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawIndex, ok := arguments["index"]
	if !ok {
		return browserToolError("missing required parameter: index"), nil
	}
	index, err := browserUsePositiveInt(rawIndex, "index")
	if err != nil {
		return browserToolError(err.Error()), nil
	}
	if err = browserUseChromeExtSwitchTab(ctx, index); err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use switch tab failed: %s", err.Error())), nil
	}
	snapshot, err := browserUseChromeExtSnapshot(ctx)
	if err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use snapshot failed after switching tabs: %s", err.Error())), nil
	}
	return chromeConnectTextWithState(snapshot), nil
}

type chromeConnectCloseTabBuiltin struct{}

func (b *chromeConnectCloseTabBuiltin) GetName() string { return "browser_use_close_tab" }
func (b *chromeConnectCloseTabBuiltin) GetDescription() string {
	return "Close a Chrome tab returned by browser_use_tabs via the OpenAgent Chrome extension. Use browser_use_tabs first, then pass the tab index to close."
}

func (b *chromeConnectCloseTabBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"index": map[string]interface{}{
				"type":        "integer",
				"description": "Tab index returned by browser_use_tabs.",
			},
		},
		"required": []string{"index"},
	}
}

func (b *chromeConnectCloseTabBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawIndex, ok := arguments["index"]
	if !ok {
		return browserToolError("missing required parameter: index"), nil
	}
	index, err := browserUsePositiveInt(rawIndex, "index")
	if err != nil {
		return browserToolError(err.Error()), nil
	}
	if err = browserUseChromeExtCloseTab(ctx, index); err != nil {
		return chromeConnectErrorWithState(fmt.Sprintf("browser use close tab failed: %s", err.Error())), nil
	}
	return chromeConnectTextWithState(fmt.Sprintf("Closed tab %d.", index)), nil
}

type chromeConnectCloseBuiltin struct{}

func (b *chromeConnectCloseBuiltin) GetName() string { return "browser_use_close" }
func (b *chromeConnectCloseBuiltin) GetDescription() string {
	return "Disconnect the OpenAgent Chrome extension bridge. Only use this when the user explicitly asks to stop browser use; do not use it between related follow-up tasks. Chrome tabs are left open."
}

func (b *chromeConnectCloseBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *chromeConnectCloseBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	_ = globalBrowserUseChromeExtBridge.requestDisconnect(ctx)
	globalBrowserUseChromeExtBridge.disconnect()
	return browserToolText("OpenAgent Chrome extension bridge disconnected. Chrome tabs were left open."), nil
}

func browserUseChromeExtTabsToBrowserUseTabs(tabs []browserUseChromeExtTab) []browserUseTab {
	res := make([]browserUseTab, 0, len(tabs))
	for index, tab := range tabs {
		res = append(res, browserUseTab{
			Index:      index + 1,
			ID:         target.ID(strconv.Itoa(tab.ID)),
			Title:      tab.Title,
			URL:        tab.URL,
			Active:     tab.Active,
			Controlled: tab.Controlled,
			Protected:  tab.Protected,
		})
	}
	return res
}
