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

package audit

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestRecordAppendsJSONLPerSession(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("OPENAGENT_AUDIT_DIR", dir)

	Record(Event{Type: "tool_call", Tool: "read_file", SessionID: "sess1", ArgumentsLength: 12, Outcome: "success", DurationMs: 7})
	Record(Event{Type: "tool_call", Tool: "search", Server: "web", SessionID: "sess1", Outcome: "failure"})
	Record(Event{Type: ""}) // no type: must be dropped
	flush()

	events := readEvents(t, filepath.Join(dir, "sess1.jsonl"))
	if len(events) != 2 {
		t.Fatalf("got %d events, want 2 (empty-type event must be dropped)", len(events))
	}
	if events[0].Tool != "read_file" || events[0].Outcome != "success" || events[0].ArgumentsLength != 12 || events[0].DurationMs != 7 {
		t.Errorf("first event fields wrong: %+v", events[0])
	}
	if events[0].Timestamp == "" {
		t.Errorf("timestamp should be stamped by Record")
	}
	if events[1].Server != "web" || events[1].Outcome != "failure" {
		t.Errorf("second event fields wrong: %+v", events[1])
	}
}

// TestRecordMessageEvent covers "message", the one event type this log
// carries actual conversation text on (see the package doc). It must
// round-trip Role and Text intact, same as every other field.
func TestRecordMessageEvent(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("OPENAGENT_AUDIT_DIR", dir)

	Record(Event{Type: "message", SessionID: "sess1", Role: "user", Text: "现在几点？"})
	Record(Event{Type: "message", SessionID: "sess1", Role: "assistant", Text: "现在是 UTC 12:00。"})
	flush()

	events := readEvents(t, filepath.Join(dir, "sess1.jsonl"))
	if len(events) != 2 {
		t.Fatalf("got %d events, want 2", len(events))
	}
	if events[0].Role != "user" || events[0].Text != "现在几点？" {
		t.Errorf("user message event wrong: %+v", events[0])
	}
	if events[1].Role != "assistant" || events[1].Text != "现在是 UTC 12:00。" {
		t.Errorf("assistant message event wrong: %+v", events[1])
	}
}

// TestRecordChatTitleEvent covers the "chat_title" event message_answer.go
// emits alongside chat.DisplayName: an external reader (aiguard's Sessions
// page) needs the Title field to round-trip through the JSONL line intact.
func TestRecordChatTitleEvent(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("OPENAGENT_AUDIT_DIR", dir)

	Record(Event{Type: "chat_title", SessionID: "sess1", Title: "北京天气查询概况"})
	flush()

	events := readEvents(t, filepath.Join(dir, "sess1.jsonl"))
	if len(events) != 1 {
		t.Fatalf("got %d events, want 1", len(events))
	}
	if events[0].Type != "chat_title" || events[0].Title != "北京天气查询概况" {
		t.Errorf("chat_title event fields wrong: %+v", events[0])
	}
}

func TestRecordFallsBackToDefaultSessionFile(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("OPENAGENT_AUDIT_DIR", dir)

	Record(Event{Type: "tool_call", Tool: "time"})
	flush()

	if _, err := os.Stat(filepath.Join(dir, "openagent.jsonl")); err != nil {
		t.Fatalf("event with no session id should land in openagent.jsonl: %v", err)
	}
}

func TestSanitizeSession(t *testing.T) {
	tests := map[string]string{
		"":             "openagent",
		"sess_ABC-1.2": "sess_ABC-1.2",
		"a/b\\c":       "a-b-c",
		"../../etc":    "etc",
		"..":           "openagent",
	}
	for in, want := range tests {
		if got := sanitizeSession(in); got != want {
			t.Errorf("sanitizeSession(%q) = %q, want %q", in, got, want)
		}
	}
}

func readEvents(t *testing.T, path string) []Event {
	t.Helper()
	file, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	var events []Event
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		var event Event
		if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
			t.Fatalf("bad JSONL line %q: %v", scanner.Text(), err)
		}
		events = append(events, event)
	}
	return events
}
