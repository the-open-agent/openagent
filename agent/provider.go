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
	"fmt"

	"github.com/ThinkInAIXYZ/go-mcp/client"
	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/the-open-agent/openagent/agent/builtin_tool"
	"github.com/the-open-agent/openagent/i18n"
)

type AgentProvider interface {
	GetAgentClients() (*AgentClients, error)
}

type AgentClients struct {
	Clients          map[string]*client.Client
	Tools            []*protocol.Tool
	BuiltinToolReg   *builtin_tool.ToolRegistry
	WebSearchEnabled bool
}

func GetAgentProvider(typ string, subType string, text string, mcpTools []*McpTools, lang string) (AgentProvider, error) {
	var p AgentProvider
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
