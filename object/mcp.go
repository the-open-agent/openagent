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

package object

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/the-open-agent/openagent/agent"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/mcp"
	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
)

type Mcp struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`

	DisplayName  string `xorm:"varchar(100)" json:"displayName"`
	DisplayName2 string `xorm:"varchar(100)" json:"displayName2"`

	Text     string          `xorm:"mediumtext" json:"text"`
	McpTools []*mcp.McpTools `xorm:"text" json:"mcpTools"`

	TestContent   string `xorm:"varchar(500)" json:"testContent"`
	ResultSummary string `xorm:"varchar(500)" json:"resultSummary"`

	State    string `xorm:"varchar(100)" json:"state"`
	IsRemote bool   `json:"isRemote"`
}

func (m *Mcp) GetId() string {
	return fmt.Sprintf("%s/%s", m.Owner, m.Name)
}

func GetMcps(owner string) ([]*Mcp, error) {
	mcps := []*Mcp{}
	err := adapter.engine.Desc("created_time").Find(&mcps, &Mcp{Owner: owner})
	if err != nil {
		return mcps, err
	}

	if providerAdapter != nil {
		mcps2 := []*Mcp{}
		err = providerAdapter.engine.Desc("created_time").Find(&mcps2, &Mcp{Owner: owner})
		if err != nil {
			return mcps, err
		}
		for _, m := range mcps2 {
			m.IsRemote = true
		}
		mcps = append(mcps, mcps2...)
	}

	return mcps, nil
}

func getMcp(owner string, name string) (*Mcp, error) {
	mcp := Mcp{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&mcp)
	if err != nil {
		return nil, err
	}

	if providerAdapter != nil && !existed {
		existed, err = providerAdapter.engine.Get(&mcp)
		if err != nil {
			return nil, err
		}
		if existed {
			mcp.IsRemote = true
		}
	}

	if existed {
		return &mcp, nil
	}
	return nil, nil
}

func GetMcp(id string) (*Mcp, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getMcp(owner, name)
}

func AddMcp(mcp *Mcp) (bool, error) {
	mcp.Owner = "admin"

	if providerAdapter != nil && mcp.IsRemote {
		affected, err := providerAdapter.engine.Insert(mcp)
		if err != nil {
			return false, err
		}
		return affected != 0, nil
	}

	affected, err := adapter.engine.Insert(mcp)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func UpdateMcp(id string, mcp *Mcp) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}

	if providerAdapter != nil && mcp.IsRemote {
		_, err = providerAdapter.engine.ID(core.PK{owner, name}).AllCols().Update(mcp)
		if err != nil {
			return false, err
		}
		return true, nil
	}

	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(mcp)
	if err != nil {
		return false, err
	}
	return true, nil
}

func DeleteMcp(mcp *Mcp) (bool, error) {
	if providerAdapter != nil && mcp.IsRemote {
		affected, err := providerAdapter.engine.ID(core.PK{mcp.Owner, mcp.Name}).Delete(&Mcp{})
		if err != nil {
			return false, err
		}
		return affected != 0, nil
	}

	affected, err := adapter.engine.ID(core.PK{mcp.Owner, mcp.Name}).Delete(&Mcp{})
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func RefreshMcpTools(m *Mcp) error {
	tools, err := mcp.GetToolsList(m.Text)
	if err != nil {
		return err
	}

	m.McpTools = tools
	return nil
}

func TestMcpProvider(m *Mcp, lang string) (string, error) {
	if strings.TrimSpace(m.Text) == "" {
		return "", fmt.Errorf("MCP servers configuration (text) is empty")
	}
	var payload struct {
		Tool      string                 `json:"tool"`
		Arguments map[string]interface{} `json:"arguments"`
	}
	if err := json.Unmarshal([]byte(m.TestContent), &payload); err != nil {
		return "", fmt.Errorf(i18n.Translate(lang, "object:invalid MCP test JSON in testContent: %v"), err)
	}
	if strings.TrimSpace(payload.Tool) == "" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:MCP test JSON must include non-empty \"tool\""))
	}
	if payload.Arguments == nil {
		payload.Arguments = map[string]interface{}{}
	}
	return mcp.TestMcpToolCall(m.Text, m.McpTools, payload.Tool, payload.Arguments)
}

func GetAgentMcpFromContext(owner string, name string, lang string) (agent.AgentProvider, error) {
	var providerName string
	if name != "" {
		providerName = name
	} else {
		store, err := GetDefaultStore(owner)
		if err != nil {
			return nil, err
		}
		if store != nil && store.AgentProvider != "" {
			providerName = store.AgentProvider
		}
	}

	if providerName == "" {
		return nil, nil
	}

	mcpObj, err := GetMcp(util.GetIdFromOwnerAndName(owner, providerName))
	if err != nil {
		return nil, err
	}
	if mcpObj == nil {
		return nil, nil
	}

	return mcp.GetAgentProvider("MCP", "", mcpObj.Text, mcpObj.McpTools, lang)
}
