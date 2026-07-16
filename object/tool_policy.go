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
	"fmt"
	"strings"

	"github.com/the-open-agent/openagent/guard"
	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
)

// ToolPolicy is a single tool-permission rule. It is the DB-backed source of
// the loosely-coupled guard engine: rows are translated into guard.Rule at
// enforcement time. Rules are scoped to a store (agent); an empty or "*" Store
// applies the rule to every store owned by the same owner.
type ToolPolicy struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`

	DisplayName string `xorm:"varchar(100)" json:"displayName"`
	Store       string `xorm:"varchar(100) index" json:"store"`

	// Match patterns; "" or "*" means "any". Tool/Resource accept globs (*, ?).
	Subject  string `xorm:"varchar(100)" json:"subject"`
	Tool     string `xorm:"varchar(200)" json:"tool"`
	Category string `xorm:"varchar(100)" json:"category"`
	Resource string `xorm:"varchar(500)" json:"resource"`

	// Effect is one of "allow" / "ask" / "deny".
	Effect   string `xorm:"varchar(100)" json:"effect"`
	Priority int    `json:"priority"`

	State string `xorm:"varchar(100)" json:"state"`
}

// normalize canonicalizes and validates a policy before it is persisted, so the
// DB never holds an ambiguous effect/state. Effect is lowercased and MUST be one
// of allow/ask/deny (empty or unknown is rejected — the engine treats unknowns
// as deny, so a mislabeled rule must not slip in silently). An empty state
// defaults to "Active".
func (p *ToolPolicy) normalize() error {
	p.Effect = strings.ToLower(strings.TrimSpace(p.Effect))
	switch guard.Effect(p.Effect) {
	case guard.EffectAllow, guard.EffectAsk, guard.EffectDeny:
	default:
		return fmt.Errorf("invalid effect %q: must be allow, ask or deny", p.Effect)
	}
	if p.State == "" {
		p.State = "Active"
	}
	if p.State != "Active" && p.State != "Disabled" {
		return fmt.Errorf("invalid state %q: must be Active or Disabled", p.State)
	}
	return nil
}

func GetToolPolicies(owner string) ([]*ToolPolicy, error) {
	policies := []*ToolPolicy{}
	err := adapter.engine.Desc("priority").Desc("created_time").Find(&policies, &ToolPolicy{Owner: owner})
	return policies, err
}

func getToolPolicy(owner string, name string) (*ToolPolicy, error) {
	p := ToolPolicy{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&p)
	if err != nil {
		return &p, err
	}
	if existed {
		return &p, nil
	}
	return nil, nil
}

func GetToolPolicy(id string) (*ToolPolicy, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getToolPolicy(owner, name)
}

func GetToolPolicyCount(owner, field, value string) (int64, error) {
	session := GetDbSession(owner, -1, -1, field, value, "", "")
	return session.Count(&ToolPolicy{})
}

func GetPaginationToolPolicies(owner string, offset, limit int, field, value, sortField, sortOrder string) ([]*ToolPolicy, error) {
	policies := []*ToolPolicy{}
	session := GetDbSession(owner, offset, limit, field, value, sortField, sortOrder)
	err := session.Find(&policies)
	return policies, err
}

func UpdateToolPolicy(id string, p *ToolPolicy) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	policyDb, err := getToolPolicy(owner, name)
	if err != nil {
		return false, err
	}
	if p == nil || policyDb == nil {
		return false, nil
	}
	if err := p.normalize(); err != nil {
		return false, err
	}

	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(p)
	if err != nil {
		return false, err
	}
	return true, nil
}

func AddToolPolicy(p *ToolPolicy) (bool, error) {
	if err := p.normalize(); err != nil {
		return false, err
	}
	affected, err := adapter.engine.Insert(p)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func DeleteToolPolicy(p *ToolPolicy) (bool, error) {
	affected, err := adapter.engine.ID(core.PK{p.Owner, p.Name}).Delete(&ToolPolicy{})
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}
