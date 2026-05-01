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
	"github.com/ThinkInAIXYZ/go-mcp/client"
	"github.com/the-open-agent/openagent/mcp"
)

// Deprecated: use mcp.ServerConfig instead.
type ServerConfig = mcp.ServerConfig

// Deprecated: use mcp.McpTools instead.
type McpTools = mcp.McpTools

// Deprecated: use mcp.GetToolsList instead.
func GetToolsList(config string) ([]*McpTools, error) {
	return mcp.GetToolsList(config)
}

// Deprecated: use mcp.GetMCPClientMap instead.
func GetMCPClientMap(config string, toolsMap map[string]bool) (map[string]*client.Client, error) {
	return mcp.GetMCPClientMap(config, toolsMap)
}

// Deprecated: use mcp.ResolveMcpToolTarget instead.
func ResolveMcpToolTarget(mcpTools []*McpTools, toolKey string) (serverName, nativeToolName string, err error) {
	return mcp.ResolveMcpToolTarget(mcpTools, toolKey)
}

// Deprecated: use mcp.TestMcpToolCall instead.
func TestMcpToolCall(mcpServers string, mcpTools []*McpTools, toolKey string, arguments map[string]interface{}) (string, error) {
	return mcp.TestMcpToolCall(mcpServers, mcpTools, toolKey, arguments)
}
