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

// Package guard is a standalone, host-agnostic permission engine for agent
// tool calls. It has no dependency on OpenAgent (no object/model/beego imports)
// so it can be reused as-is by other agents (Longxia, Hermes, ...).
//
// The host maps its own domain (agent, store, user, tool call)
// into a Request, provides policy rules, and receives an Effect back. What the
// host does with an "Ask" effect is delegated to an Approver the host supplies.
package guard

import "context"

// Effect is the outcome of a permission decision.
type Effect string

const (
	// EffectAllow lets the tool call run without interruption.
	EffectAllow Effect = "allow"
	// EffectAsk requires an out-of-band approval before the call may run.
	EffectAsk Effect = "ask"
	// EffectDeny blocks the tool call.
	EffectDeny Effect = "deny"
)

// Category is a coarse capability class used to write broad rules without
// enumerating every tool. Hosts tag each tool with one of these (or a custom
// value); policies may target a category instead of a specific tool name.
const (
	CategoryRead      = "read"
	CategoryWrite     = "write"
	CategoryExec      = "exec"
	CategoryNetwork   = "network"
	CategorySensitive = "sensitive"
	CategoryUnknown   = "unknown"
)

// Request describes a single tool call to be authorized. Every field is a
// plain string so the engine stays decoupled from any host type.
type Request struct {
	// Subject is the caller identity/role the rules are written against
	// (e.g. an agent id, a store name, or a role). Role hierarchy is honored.
	Subject string
	// Tool is the concrete tool name being invoked (e.g. "shell", "web_fetch").
	Tool string
	// Category is the tool's capability class (see Category* constants).
	Category string
	// Resource is the single most security-relevant argument of the call —
	// the host picks it per tool (a shell command, a file path, a URL host).
	// Rules may pattern-match against it for fine-grained control.
	Resource string
}

// Decision is the resolved outcome plus provenance for auditing.
type Decision struct {
	Effect Effect
	// Reason is a short human-readable explanation (matched rule or default).
	Reason string
	// Rule is the id/name of the matched policy rule, empty if defaulted.
	Rule string
}

// Guard authorizes tool calls against a policy set.
type Guard interface {
	// Check resolves an Effect for the request. It never executes anything.
	Check(ctx context.Context, req Request) (Decision, error)
}

// Approver resolves an EffectAsk decision into a concrete allow/deny. The host
// implements the transport (prompt the user over SSE, a webhook, auto-deny in
// headless runs, ...). Returning an error is treated by callers as a denial.
type Approver interface {
	RequestApproval(ctx context.Context, req Request, d Decision) (approved bool, err error)
}

// Rule is one policy entry. Pattern fields accept "*" (any), an exact string,
// or a glob using "*"/"?" wildcards (anchored). Subject participates in role
// hierarchy: a rule for subject "admin" also applies to roles that inherit it.
type Rule struct {
	// Name identifies the rule for auditing (optional); surfaced as Decision.Rule.
	Name string
	// Subject/Tool/Category/Resource are match patterns ("*" = any).
	Subject  string
	Tool     string
	Category string
	Resource string
	// Effect is what to apply when this rule matches.
	Effect Effect
	// Priority orders rules; the highest-priority matching rule wins.
	// By convention deny > ask > allow so denies override, but the host is
	// free to choose. Ties are broken deterministically (deny > ask > allow).
	Priority int
}

// RoleLink expresses "child inherits parent" for subject role hierarchy,
// e.g. {Child: "store-x", Parent: "user"}.
type RoleLink struct {
	Child  string
	Parent string
}

// Policy is the full rule set plus role hierarchy and the default effect used
// when no rule matches.
type Policy struct {
	Rules   []Rule
	Roles   []RoleLink
	Default Effect
}
