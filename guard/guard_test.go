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

package guard

import (
	"context"
	"testing"
)

func mustGuard(t *testing.T, p Policy) *CasbinGuard {
	t.Helper()
	g, err := NewCasbinGuard(p)
	if err != nil {
		t.Fatalf("NewCasbinGuard: %v", err)
	}
	return g
}

func check(t *testing.T, g *CasbinGuard, req Request) Effect {
	t.Helper()
	d, err := g.Check(context.Background(), req)
	if err != nil {
		t.Fatalf("Check(%+v): %v", req, err)
	}
	return d.Effect
}

func TestDefaultEffectWhenNoRuleMatches(t *testing.T) {
	g := mustGuard(t, Policy{Default: EffectDeny})
	if got := check(t, g, Request{Subject: "a", Tool: "shell"}); got != EffectDeny {
		t.Errorf("want deny, got %s", got)
	}

	g2 := mustGuard(t, Policy{Default: EffectAllow})
	if got := check(t, g2, Request{Subject: "a", Tool: "shell"}); got != EffectAllow {
		t.Errorf("want allow, got %s", got)
	}
}

func TestEmptyPolicyDefaultsToAsk(t *testing.T) {
	// An unconfigured policy must not silently allow; it defaults to ask.
	g := mustGuard(t, Policy{})
	if got := check(t, g, Request{Subject: "a", Tool: "shell"}); got != EffectAsk {
		t.Errorf("empty policy should default to ask, got %s", got)
	}
}

func TestInvalidEffectRejected(t *testing.T) {
	if _, err := NewCasbinGuard(Policy{Rules: []Rule{{Tool: "shell", Effect: "DENY"}}}); err == nil {
		t.Error(`rule effect "DENY" (uppercase) should be rejected, not passed through`)
	}
	if _, err := NewCasbinGuard(Policy{Default: "nope"}); err == nil {
		t.Error("invalid default effect should be rejected")
	}
}

func TestRuleNameInDecision(t *testing.T) {
	// Decision.Rule should carry the matched rule's Name, not a joined policy row.
	g := mustGuard(t, Policy{
		Default: EffectAllow,
		Rules: []Rule{
			{Name: "no-shell", Tool: "shell", Effect: EffectDeny, Priority: 100},
		},
	})
	d, err := g.Check(context.Background(), Request{Tool: "shell"})
	if err != nil {
		t.Fatalf("Check: %v", err)
	}
	if d.Effect != EffectDeny {
		t.Fatalf("want deny, got %s", d.Effect)
	}
	if d.Rule != "no-shell" {
		t.Errorf("Decision.Rule = %q, want %q", d.Rule, "no-shell")
	}
}

func TestCategoryRuleMatches(t *testing.T) {
	g := mustGuard(t, Policy{
		Default: EffectAsk,
		Rules: []Rule{
			{Category: CategoryRead, Effect: EffectAllow, Priority: 100},
		},
	})
	if got := check(t, g, Request{Tool: "web_fetch", Category: CategoryRead}); got != EffectAllow {
		t.Errorf("read should be allowed, got %s", got)
	}
	if got := check(t, g, Request{Tool: "shell", Category: CategoryExec}); got != EffectAsk {
		t.Errorf("exec should fall through to default ask, got %s", got)
	}
}

func TestDenyOverridesAllowAtSamePriority(t *testing.T) {
	g := mustGuard(t, Policy{
		Default: EffectAllow,
		Rules: []Rule{
			{Tool: "*", Effect: EffectAllow, Priority: 100},
			{Tool: "shell", Effect: EffectDeny, Priority: 100},
		},
	})
	if got := check(t, g, Request{Tool: "shell"}); got != EffectDeny {
		t.Errorf("deny should override allow at same priority, got %s", got)
	}
	if got := check(t, g, Request{Tool: "web_fetch"}); got != EffectAllow {
		t.Errorf("non-shell should be allowed, got %s", got)
	}
}

func TestPriorityOrdering(t *testing.T) {
	g := mustGuard(t, Policy{
		Default: EffectDeny,
		Rules: []Rule{
			{Tool: "shell", Effect: EffectDeny, Priority: 10},
			{Tool: "shell", Effect: EffectAllow, Priority: 50}, // higher wins
		},
	})
	if got := check(t, g, Request{Tool: "shell"}); got != EffectAllow {
		t.Errorf("higher priority allow should win, got %s", got)
	}
}

func TestGlobToolMatch(t *testing.T) {
	g := mustGuard(t, Policy{
		Default: EffectAllow,
		Rules: []Rule{
			{Tool: "office_*", Effect: EffectAsk, Priority: 100},
		},
	})
	if got := check(t, g, Request{Tool: "office_word"}); got != EffectAsk {
		t.Errorf("office_word should match office_*, got %s", got)
	}
	if got := check(t, g, Request{Tool: "web_fetch"}); got != EffectAllow {
		t.Errorf("web_fetch should not match office_*, got %s", got)
	}
}

func TestResourcePatternMatch(t *testing.T) {
	g := mustGuard(t, Policy{
		Default: EffectAllow,
		Rules: []Rule{
			{Tool: "shell", Resource: "*rm -rf*", Effect: EffectDeny, Priority: 200},
		},
	})
	if got := check(t, g, Request{Tool: "shell", Resource: "sudo rm -rf /"}); got != EffectDeny {
		t.Errorf("dangerous command should be denied, got %s", got)
	}
	if got := check(t, g, Request{Tool: "shell", Resource: "ls -la"}); got != EffectAllow {
		t.Errorf("safe command should be allowed, got %s", got)
	}
}

func TestRoleHierarchy(t *testing.T) {
	// store-x inherits "user"; a rule on "user" applies to "store-x".
	g := mustGuard(t, Policy{
		Default: EffectDeny,
		Roles:   []RoleLink{{Child: "store-x", Parent: "user"}},
		Rules: []Rule{
			{Subject: "user", Category: CategoryRead, Effect: EffectAllow, Priority: 100},
		},
	})
	if got := check(t, g, Request{Subject: "store-x", Tool: "web_fetch", Category: CategoryRead}); got != EffectAllow {
		t.Errorf("store-x should inherit user's read allow, got %s", got)
	}
}
