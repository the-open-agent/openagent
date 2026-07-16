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

package object

import (
	"testing"

	"github.com/the-open-agent/openagent/guard"
)

func TestInferToolCategory(t *testing.T) {
	cases := []struct {
		name string
		tool string
		want string
	}{
		{"shell is exec", "shell", guard.CategoryExec},
		{"terminal token is exec", "terminal_run", guard.CategoryExec},
		{"bash token is exec", "bash_tool", guard.CategoryExec},
		{"write is write", "file_write", guard.CategoryWrite},
		{"download is write", "download_file", guard.CategoryWrite},
		{"web search is network", "web_search", guard.CategoryNetwork},
		{"browser is network", "browser_navigate", guard.CategoryNetwork},
		{"read is read", "read_file", guard.CategoryRead},
		{"scan is read", "scan_dirs", guard.CategoryRead},
		// Whole-token matching must not be fooled by substrings: "spreadsheet"
		// contains "read" and "research" contains "search", yet neither should be
		// classified from that substring.
		{"spreadsheet is not read", "spreadsheet_tool", guard.CategoryUnknown},
		{"research is not network", "research_agent", guard.CategoryUnknown},
		{"unknown mcp tool", "some_mcp_thing", guard.CategoryUnknown},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := inferToolCategory(c.tool); got != c.want {
				t.Fatalf("inferToolCategory(%q) = %q, want %q", c.tool, got, c.want)
			}
		})
	}
}

func TestExtractResource(t *testing.T) {
	cases := []struct {
		name string
		args map[string]interface{}
		want string
	}{
		{"nil args", nil, ""},
		{"empty args", map[string]interface{}{}, ""},
		{"command key", map[string]interface{}{"command": "rm -rf /"}, "rm -rf /"},
		{"cmd key", map[string]interface{}{"cmd": "ls"}, "ls"},
		{"path key", map[string]interface{}{"path": "/etc/passwd"}, "/etc/passwd"},
		{"url key", map[string]interface{}{"url": "https://example.com"}, "https://example.com"},
		// "command" is earlier in the priority list than "path", so it wins.
		{"known-key priority", map[string]interface{}{"path": "/p", "command": "rm"}, "rm"},
		// A known key whose value is not a non-empty string is skipped.
		{"non-string known key skipped", map[string]interface{}{"path": 123, "url": "http://y"}, "http://y"},
		{"empty known key then fallback", map[string]interface{}{"command": "", "zzz": "z"}, "z"},
		// Fallback is deterministic: first non-empty string in sorted-key order.
		{"fallback sorted deterministic", map[string]interface{}{"b": "second", "a": "first"}, "first"},
		{"fallback ignores non-strings", map[string]interface{}{"n": 5, "m": "hit"}, "hit"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := extractResource(c.args); got != c.want {
				t.Fatalf("extractResource(%v) = %q, want %q", c.args, got, c.want)
			}
		})
	}
}

func TestExecEffectRank(t *testing.T) {
	if !(execEffectRank(guard.EffectDeny) > execEffectRank(guard.EffectAsk) &&
		execEffectRank(guard.EffectAsk) > execEffectRank(guard.EffectAllow)) {
		t.Fatalf("exec effect rank must order deny > ask > allow, got deny=%d ask=%d allow=%d",
			execEffectRank(guard.EffectDeny), execEffectRank(guard.EffectAsk), execEffectRank(guard.EffectAllow))
	}
}

func mustGuard(t *testing.T, rules []guard.Rule) *guard.CasbinGuard {
	t.Helper()
	g, err := guard.NewCasbinGuard(guard.Policy{Rules: rules, Default: guard.EffectAllow})
	if err != nil {
		t.Fatalf("NewCasbinGuard: %v", err)
	}
	return g
}

func execReq(command string) guard.Request {
	return guard.Request{
		Subject:  "agent1",
		Tool:     "shell",
		Category: guard.CategoryExec,
		Resource: command,
	}
}

func TestEvaluateExecCommand(t *testing.T) {
	denyRm := guard.Rule{Name: "deny-rm", Category: guard.CategoryExec, Resource: "rm", Effect: guard.EffectDeny, Priority: 100}

	t.Run("per-program deny catches chained rm", func(t *testing.T) {
		// A rule keyed on the program basename "rm" must fire even when rm is
		// hidden behind a chain operator that a whole-string match would miss.
		g := mustGuard(t, []guard.Rule{denyRm})
		d, err := evaluateExecCommand(g, execReq("ls && rm -rf /"))
		if err != nil {
			t.Fatal(err)
		}
		if d.Effect != guard.EffectDeny {
			t.Fatalf("want deny, got %s (%s)", d.Effect, d.Reason)
		}
	})

	t.Run("allow when no program is denied", func(t *testing.T) {
		g := mustGuard(t, []guard.Rule{denyRm})
		d, err := evaluateExecCommand(g, execReq("ls -la"))
		if err != nil {
			t.Fatal(err)
		}
		if d.Effect != guard.EffectAllow {
			t.Fatalf("want allow, got %s (%s)", d.Effect, d.Reason)
		}
	})

	t.Run("whole-command glob deny", func(t *testing.T) {
		// A rule keyed on the full command string (only reachable by the
		// whole-command match, never a per-program basename) must still fire.
		g := mustGuard(t, []guard.Rule{{Name: "deny-rmrf", Category: guard.CategoryExec, Resource: "*rm -rf*", Effect: guard.EffectDeny}})
		d, err := evaluateExecCommand(g, execReq("rm -rf /tmp"))
		if err != nil {
			t.Fatal(err)
		}
		if d.Effect != guard.EffectDeny {
			t.Fatalf("want deny, got %s (%s)", d.Effect, d.Reason)
		}
	})

	t.Run("per-program deny overrides whole-command allow", func(t *testing.T) {
		// The whole command matches a broad allow, but one program is denied;
		// the most restrictive result must win so the denied program can't ride
		// along inside an otherwise-allowed command.
		g := mustGuard(t, []guard.Rule{
			{Name: "allow-all", Category: guard.CategoryExec, Resource: "*", Effect: guard.EffectAllow, Priority: 1},
			{Name: "deny-sudo", Category: guard.CategoryExec, Resource: "sudo", Effect: guard.EffectDeny, Priority: 1},
		})
		d, err := evaluateExecCommand(g, execReq("sudo apt update"))
		if err != nil {
			t.Fatal(err)
		}
		if d.Effect != guard.EffectDeny {
			t.Fatalf("want deny, got %s (%s)", d.Effect, d.Reason)
		}
	})

	t.Run("uncertain command routes to ask", func(t *testing.T) {
		// A dynamic command word can't be resolved to program names; it must be
		// routed to approval, never silently allowed nor hard-denied.
		g := mustGuard(t, []guard.Rule{denyRm})
		d, err := evaluateExecCommand(g, execReq("X=rm; $X -rf /"))
		if err != nil {
			t.Fatal(err)
		}
		if d.Effect != guard.EffectAsk {
			t.Fatalf("want ask, got %s (%s)", d.Effect, d.Reason)
		}
	})
}
