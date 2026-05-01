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

package agent

import (
	"encoding/json"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
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

func (p *McpAgentProvider) GetAgentClients() (*AgentClients, error) {
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
	return &AgentClients{
		Clients: clients,
		Tools:   tools,
	}, nil
}
