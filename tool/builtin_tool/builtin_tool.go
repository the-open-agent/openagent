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

package builtin_tool

import (
	"context"
	"encoding/json"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
)

type BuiltinTool interface {
	GetName() string
	GetDescription() string
	GetInputSchema() interface{}
	Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error)
}

type ToolRegistry struct {
	tools map[string]BuiltinTool
	order []string
}

func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		tools: make(map[string]BuiltinTool),
	}
}

func (r *ToolRegistry) RegisterTool(tool BuiltinTool) {
	name := tool.GetName()
	if _, exists := r.tools[name]; !exists {
		r.order = append(r.order, name)
	}
	r.tools[name] = tool
}

func (r *ToolRegistry) GetTool(name string) (BuiltinTool, bool) {
	tool, exists := r.tools[name]
	return tool, exists
}

func (r *ToolRegistry) GetAllTools() map[string]BuiltinTool {
	return r.tools
}

func (r *ToolRegistry) GetToolsAsProtocolTools() []*protocol.Tool {
	var tools []*protocol.Tool
	for _, name := range r.order {
		tool, ok := r.tools[name]
		if !ok {
			continue
		}
		// InputSchema to protocol.InputSchema
		schemaInterface := tool.GetInputSchema()
		schemaBytes, err := json.Marshal(schemaInterface)
		if err != nil {
			continue
		}

		var inputSchema protocol.InputSchema
		if err := json.Unmarshal(schemaBytes, &inputSchema); err != nil {
			continue
		}

		tools = append(tools, &protocol.Tool{
			Name:        tool.GetName(),
			Description: tool.GetDescription(),
			InputSchema: inputSchema,
		})
	}
	return tools
}

func (r *ToolRegistry) ExecuteTool(ctx context.Context, name string, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	tool, exists := r.GetTool(name)
	if !exists {
		return &protocol.CallToolResult{
			IsError: true,
			Content: []protocol.Content{
				&protocol.TextContent{
					Type: "text",
					Text: "Tool not found: " + name,
				},
			},
		}, nil
	}

	return tool.Execute(ctx, arguments)
}
