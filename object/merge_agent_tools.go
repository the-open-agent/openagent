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
	"github.com/the-open-agent/openagent/agent"
	"github.com/the-open-agent/openagent/agent/builtin_tool"
	"github.com/the-open-agent/openagent/tool"
	"github.com/the-open-agent/openagent/util"
)

func buildMergedBuiltinRegistry(store *Store, lang string) *builtin_tool.ToolRegistry {
	reg := builtin_tool.NewToolRegistry()

	if store == nil {
		return reg
	}

	for _, tname := range store.Tools {
		id := util.GetIdFromOwnerAndName(store.Owner, tname)
		t, err := GetTool(id)
		if err != nil || t == nil {
			continue
		}
		tp, err := tool.New(getToolConfig(t), lang)
		if err != nil {
			continue
		}
		for _, bt := range tp.BuiltinTools() {
			reg.RegisterTool(bt)
		}
	}

	return reg
}

// MergeAgentToolClients merges MCP agent tools with tools from configured Tools, plus web-search flag.
func MergeAgentToolClients(agentClients *agent.AgentClients, store *Store, webSearchEnabled bool, lang string) *agent.AgentClients {
	if webSearchEnabled {
		if agentClients == nil {
			agentClients = &agent.AgentClients{}
		}
		agentClients.WebSearchEnabled = true
	}

	reg := buildMergedBuiltinRegistry(store, lang)
	allTools := reg.GetToolsAsProtocolTools()
	if len(allTools) == 0 {
		return agentClients
	}

	if agentClients == nil {
		return &agent.AgentClients{
			Tools:          allTools,
			BuiltinToolReg: reg,
		}
	}

	agentClients.Tools = append(agentClients.Tools, allTools...)
	agentClients.BuiltinToolReg = reg
	return agentClients
}
