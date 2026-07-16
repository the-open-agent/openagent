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
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/casbin/casbin/v2"
	casbinmodel "github.com/casbin/casbin/v2/model"
)

// modelText is the casbin model backing the guard. Every policy carries the
// real tri-state effect in its own column while the casbin effect column (eft)
// is always "allow"; this lets casbin do role resolution, glob matching and
// priority ordering for us, and we read the true effect off the matched rule.
// Rules are loaded highest-priority-first so the priority effector's
// first-match-wins yields the highest-priority matching rule. The last policy
// column is named "rank", not casbin's reserved "priority" token: were it
// "priority", casbin would insertion-sort policies by ascending number as soon
// as its field index gets built (an adapter LoadPolicy, GetFieldIndex, ...),
// silently reversing the highest-first order we establish in Go here.
const modelText = `
[request_definition]
r = sub, tool, cat, res

[policy_definition]
p = sub, tool, cat, res, effect, eft, rank, name

[role_definition]
g = _, _

[policy_effect]
e = priority(p.eft) || deny

[matchers]
m = (p.sub == "*" || g(r.sub, p.sub)) && gmatch(r.tool, p.tool) && gmatch(r.cat, p.cat) && gmatch(r.res, p.res)
`

// CasbinGuard is the casbin-backed Guard implementation.
type CasbinGuard struct {
	enforcer *casbin.Enforcer
	def      Effect
}

var regexCache sync.Map // pattern string -> *regexp.Regexp

// gmatch reports whether value matches a glob pattern. "*"/"" match anything;
// a pattern without wildcards is compared for exact equality; otherwise "*"
// and "?" are treated as glob wildcards anchored to the whole string.
func gmatch(args ...interface{}) (interface{}, error) {
	value, _ := args[0].(string)
	pattern, _ := args[1].(string)
	return globMatch(value, pattern), nil
}

func globMatch(value, pattern string) bool {
	if pattern == "" || pattern == "*" {
		return true
	}
	if !strings.ContainsAny(pattern, "*?") {
		return value == pattern
	}
	re := compileGlob(pattern)
	if re == nil {
		return value == pattern
	}
	return re.MatchString(value)
}

func compileGlob(pattern string) *regexp.Regexp {
	if cached, ok := regexCache.Load(pattern); ok {
		return cached.(*regexp.Regexp)
	}
	var b strings.Builder
	b.WriteString("^")
	for _, r := range pattern {
		switch r {
		case '*':
			b.WriteString(".*")
		case '?':
			b.WriteString(".")
		default:
			b.WriteString(regexp.QuoteMeta(string(r)))
		}
	}
	b.WriteString("$")
	re, err := regexp.Compile(b.String())
	if err != nil {
		return nil
	}
	regexCache.Store(pattern, re)
	return re
}

func effectRank(e Effect) int {
	switch e {
	case EffectDeny:
		return 3
	case EffectAsk:
		return 2
	default:
		return 1
	}
}

// validEffect reports whether e is one of the three known effects.
func validEffect(e Effect) bool {
	switch e {
	case EffectAllow, EffectAsk, EffectDeny:
		return true
	}
	return false
}

// NewCasbinGuard builds a Guard from a Policy. It is safe for concurrent Check
// calls but is immutable — rebuild it when the policy changes.
func NewCasbinGuard(policy Policy) (*CasbinGuard, error) {
	m, err := casbinmodel.NewModelFromString(modelText)
	if err != nil {
		return nil, err
	}

	e, err := casbin.NewEnforcer(m)
	if err != nil {
		return nil, err
	}
	e.AddFunction("gmatch", gmatch)

	if policy.Default != "" && !validEffect(policy.Default) {
		return nil, fmt.Errorf("guard: invalid default effect %q (want allow, ask or deny)", policy.Default)
	}

	for _, link := range policy.Roles {
		if link.Child == "" || link.Parent == "" {
			continue
		}
		if _, err := e.AddGroupingPolicy(link.Child, link.Parent); err != nil {
			return nil, err
		}
	}

	// Sort rules highest-priority-first; ties broken deny > ask > allow so a
	// deny at the same priority as an allow wins.
	rules := make([]Rule, len(policy.Rules))
	copy(rules, policy.Rules)
	sort.SliceStable(rules, func(i, j int) bool {
		if rules[i].Priority != rules[j].Priority {
			return rules[i].Priority > rules[j].Priority
		}
		return effectRank(rules[i].Effect) > effectRank(rules[j].Effect)
	})

	for _, rule := range rules {
		if rule.Effect != "" && !validEffect(rule.Effect) {
			return nil, fmt.Errorf("guard: invalid effect %q in rule %q (want allow, ask or deny)", rule.Effect, rule.Name)
		}
		eff := rule.Effect
		if eff == "" {
			eff = EffectAllow
		}
		_, err := e.AddPolicy(
			orStar(rule.Subject),
			orStar(rule.Tool),
			orStar(rule.Category),
			orStar(rule.Resource),
			string(eff),
			"allow",
			strconv.Itoa(rule.Priority),
			rule.Name,
		)
		if err != nil {
			return nil, err
		}
	}

	def := policy.Default
	if def == "" {
		// A permission engine must not silently allow when nothing is configured;
		// default to ask so an unconfigured host fails safe (deny is also valid).
		def = EffectAsk
	}

	return &CasbinGuard{enforcer: e, def: def}, nil
}

func orStar(s string) string {
	if s == "" {
		return "*"
	}
	return s
}

// Check resolves the effect for a request via the casbin enforcer.
func (g *CasbinGuard) Check(ctx context.Context, req Request) (Decision, error) {
	ok, explains, err := g.enforcer.EnforceEx(
		orStar(req.Subject),
		orStar(req.Tool),
		orStar(req.Category),
		orStar(req.Resource),
	)
	if err != nil {
		return Decision{}, err
	}

	// A matched rule always has eft "allow", so ok==true means some rule
	// matched; explains holds that rule and column 4 is its real effect.
	if ok && len(explains) >= 5 {
		return Decision{
			Effect: Effect(explains[4]),
			Reason: fmt.Sprintf("matched rule (tool=%s, res=%s, effect=%s)", explains[1], explains[3], explains[4]),
			Rule:   ruleName(explains),
		}, nil
	}

	return Decision{
		Effect: g.def,
		Reason: "no matching rule; default effect",
	}, nil
}

// ruleName returns the matched rule's Name (the last policy column), or "" when
// the rule was defined without one.
func ruleName(explains []string) string {
	if len(explains) >= 8 {
		return explains[7]
	}
	return ""
}
