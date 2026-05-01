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

import "github.com/the-open-agent/openagent/mcp"

// Deprecated: use mcp.McpAgentProvider instead.
type McpAgentProvider = mcp.McpAgentProvider

// Deprecated: use mcp.NewMcpAgentProvider instead.
func NewMcpAgentProvider(typ string, subType string, mcpServers string, mcpTools []*McpTools) (*McpAgentProvider, error) {
	return mcp.NewMcpAgentProvider(typ, subType, mcpServers, mcpTools)
}
