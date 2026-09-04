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
	"context"
	"fmt"
	"runtime"
	"sort"
	"strings"

	"github.com/beego/beego/logs"
	"github.com/the-open-agent/openagent/guard"
	"github.com/the-open-agent/openagent/shellcmd"
)

// BuildToolPermissionChecker returns a permission gate for a store's tool
// calls, or nil when the store has no active policies (so tool execution is
// unchanged and incurs zero overhead — the feature is opt-in per store/owner).
//
// The returned closure is the only openagent-specific glue; the actual
// allow/ask/deny decision is made by the host-agnostic guard engine, which is
// what makes this reusable by other agents (Longxia, Hermes, ...).
func BuildToolPermissionChecker(store *Store, user string) func(toolName string, arguments map[string]interface{}) (bool, string) {
	if store == nil {
		return nil
	}

	policies, err := GetToolPoliciesForStore(store.Owner, store.Name)
	if err != nil || len(policies) == 0 {
		return nil
	}

	rules := make([]guard.Rule, 0, len(policies))
	for _, p := range policies {
		rules = append(rules, p.toGuardRule())
	}

	g, err := guard.NewCasbinGuard(guard.Policy{
		Rules:   rules,
		Default: guard.EffectAllow, // non-breaking: only configured rules restrict
	})
	if err != nil {
		logs.Warning("BuildToolPermissionChecker: failed to build guard for store %s/%s: %v", store.Owner, store.Name, err)
		return nil
	}

	subject := store.Name

	return func(toolName string, arguments map[string]interface{}) (bool, string) {
		req := guard.Request{
			Subject:  subject,
			Tool:     toolName,
			Category: inferToolCategory(toolName),
			Resource: extractResource(arguments),
		}

		var decision guard.Decision
		var err error
		if req.Category == guard.CategoryExec {
			// Shell/exec tools: decide per executable in the command line so
			// chaining, subshells and sudo/env wrappers can't smuggle a denied
			// program past a whole-string match. Denied if ANY program is denied.
			decision, err = evaluateExecCommand(g, req)
		} else {
			decision, err = g.Check(context.Background(), req)
		}
		if err != nil {
			// Fail CLOSED on engine error: a security gate must not allow a call it
			// could not evaluate. Log for diagnosis.
			logs.Error("tool-permission engine error store=%s tool=%s: %v", subject, toolName, err)
			return false, "tool permission check failed (engine error); denied for safety"
		}

		auditToolDecision(store.Owner, subject, user, req, decision)

		switch decision.Effect {
		case guard.EffectAllow:
			return true, ""
		case guard.EffectDeny:
			return false, decision.Reason
		case guard.EffectAsk:
			// Interactive approval lands in a follow-up; until then an "ask"
			// rule blocks and explains itself so it is never a silent allow.
			return false, "approval required (interactive approval not yet enabled): " + decision.Reason
		default:
			// Unknown effect: fail closed rather than allow an unrecognized decision.
			return false, "unrecognized permission decision; denied for safety"
		}
	}
}

// evaluateExecCommand decides an exec/shell tool call by matching both the whole
// command string and each program the command line would run, taking the most
// restrictive result. The whole-command match lets whole-string Resource globs
// (e.g. "*rm -rf*") fire; the per-program match (basename: rm, sudo, git) defeats
// chaining/subshell/wrapper evasion a single whole-string match would miss.
func evaluateExecCommand(g *guard.CasbinGuard, req guard.Request) (guard.Decision, error) {
	if runtime.GOOS == "windows" {
		// The shell tool runs via cmd.exe on Windows, but shellcmd parses POSIX
		// syntax only (%VAR%/^/batch are not understood), so its result cannot be
		// trusted here. Fail closed to approval rather than analyze it wrongly.
		return guard.Decision{
			Effect: guard.EffectAsk,
			Reason: "shell command on Windows (cmd.exe) cannot be statically analyzed; needs approval",
		}, nil
	}
	exes, certain := shellcmd.Executables(req.Resource)
	if !certain {
		// The command could not be resolved to concrete program names (a dynamic
		// "$CMD", a script/stdin-fed interpreter, an obfuscated command word).
		// Route to approval rather than a silent allow OR a hard deny: it may be
		// legitimate, but it must not run unreviewed.
		return guard.Decision{
			Effect: guard.EffectAsk,
			Reason: "shell command could not be resolved to program names; needs approval",
		}, nil
	}

	// Whole-command match first, so a rule keyed on the full command string still
	// applies (per-program basenames can never match such a pattern).
	worst, err := g.Check(context.Background(), req)
	if err != nil {
		return guard.Decision{}, err
	}
	for _, exe := range exes {
		if worst.Effect == guard.EffectDeny {
			break
		}
		sub := req
		sub.Resource = exe
		d, err := g.Check(context.Background(), sub)
		if err != nil {
			return guard.Decision{}, err
		}
		if execEffectRank(d.Effect) > execEffectRank(worst.Effect) {
			d.Reason = fmt.Sprintf("program %q: %s", exe, d.Reason)
			worst = d
		}
	}
	return worst, nil
}

func execEffectRank(e guard.Effect) int {
	switch e {
	case guard.EffectDeny:
		return 3
	case guard.EffectAsk:
		return 2
	default:
		return 1
	}
}

func auditToolDecision(owner, subject, user string, req guard.Request, d guard.Decision) {
	logs.Info("tool-permission owner=%s store=%s user=%s tool=%s category=%s effect=%s reason=%q",
		owner, subject, user, req.Tool, req.Category, d.Effect, d.Reason)
}

// inferToolCategory maps a builtin/MCP tool name to a coarse capability class so
// policies can be written against broad categories. Unknown/MCP tools fall back
// to CategoryUnknown. Matching is on whole `_`/`-`-delimited name tokens (not raw
// substrings) so e.g. "spreadsheet" is not misread as "read" nor "research" as
// "search". Checks are ordered most-privileged first.
func inferToolCategory(name string) string {
	tokens := strings.FieldsFunc(strings.ToLower(name), func(r rune) bool {
		return !(r >= 'a' && r <= 'z') && !(r >= '0' && r <= '9')
	})
	has := func(kws ...string) bool {
		for _, t := range tokens {
			for _, kw := range kws {
				if t == kw {
					return true
				}
			}
		}
		return false
	}
	switch {
	case has("shell", "exec", "terminal", "bash"):
		return guard.CategoryExec
	case has("write", "move", "download", "extract", "fill"):
		return guard.CategoryWrite
	case has("browser", "web", "fetch", "search", "video"):
		return guard.CategoryNetwork
	case has("read", "scan", "time", "skill", "dirs"):
		return guard.CategoryRead
	default:
		return guard.CategoryUnknown
	}
}

// extractResource picks the single most security-relevant argument of a tool
// call for pattern matching (a shell command, a path, a URL, a query).
func extractResource(arguments map[string]interface{}) string {
	if arguments == nil {
		return ""
	}
	for _, key := range []string{"command", "cmd", "path", "file_path", "filePath", "file", "url", "query", "keyword"} {
		if v, ok := arguments[key]; ok {
			if s, ok := v.(string); ok && s != "" {
				return s
			}
		}
	}
	// Fallback so a tool whose security-relevant argument isn't named above stays
	// governable by resource-scoped rules instead of yielding an empty (i.e.
	// match-anything) resource. Deterministic: first non-empty string value in
	// sorted-key order.
	keys := make([]string, 0, len(arguments))
	for k := range arguments {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if s, ok := arguments[k].(string); ok && s != "" {
			return s
		}
	}
	return ""
}
