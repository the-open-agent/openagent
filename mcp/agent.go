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

package mcp

import (
	"encoding/json"
	"fmt"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/the-open-agent/openagent/agent"
	"github.com/the-open-agent/openagent/i18n"
)

type McpAgentProvider struct {
	Typ        string
	SubType    string
	McpServers string
	McpTools   []*McpTools
}

func NewMcpAgentProvider(typ string, subType string, mcpServers string, mcpTools []*McpTools) (*McpAgentProvider, error) {
	p := &McpAgentProvider{
		Typ:        typ,
		SubType:    subType,
		McpServers: mcpServers,
		McpTools:   mcpTools,
	}
	return p, nil
}

func (p *McpAgentProvider) GetAgentClients() (*agent.AgentClients, error) {
	toolsMap := make(map[string]bool)
	for _, tool := range p.McpTools {
		toolsMap[tool.ServerName] = tool.IsEnabled
	}
	clients, err := GetMCPClientMap(p.McpServers, toolsMap)
	if err != nil {
		return nil, err
	}
	var tools []*protocol.Tool
	for _, mcpTool := range p.McpTools {
		if !mcpTool.IsEnabled {
			continue
		}
		toolsStr := mcpTool.Tools
		var toolsList []*protocol.Tool
		if err := json.Unmarshal([]byte(toolsStr), &toolsList); err != nil {
			return nil, err
		}
		for _, tool := range toolsList {
			tool.Name = GetIdFromServerNameAndToolName(mcpTool.ServerName, tool.Name)
		}
		tools = append(tools, toolsList...)
	}
	return &agent.AgentClients{
		Clients: clients,
		Tools:   tools,
	}, nil
}

func GetAgentProvider(typ string, subType string, text string, mcpTools []*McpTools, lang string) (agent.AgentProvider, error) {
	var p agent.AgentProvider
	var err error
	if typ == "MCP" {
		p, err = NewMcpAgentProvider(typ, subType, text, mcpTools)
	} else {
		return nil, fmt.Errorf(i18n.Translate(lang, "agent:the agent provider type: %s is not supported"), typ)
	}

	if err != nil {
		return nil, err
	}

	return p, nil
}
