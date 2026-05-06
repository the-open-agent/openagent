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
	"github.com/the-open-agent/openagent/mcp"
	"github.com/the-open-agent/openagent/tool"
	"github.com/the-open-agent/openagent/tool/builtin_tool"
)

func buildMergedBuiltinRegistry(store *Store, lang string) *builtin_tool.ToolRegistry {
	return buildMergedBuiltinRegistryWithLoader(store, lang, GetToolByOwnerAndName)
}

func buildMergedBuiltinRegistryWithLoader(store *Store, lang string, loadTool func(owner string, name string) (*Tool, error)) *builtin_tool.ToolRegistry {
	reg := builtin_tool.NewToolRegistry()

	if store == nil {
		return reg
	}

	for _, toolName := range store.Tools {
		t, err := loadTool(store.Owner, toolName)
		if err != nil || t == nil || t.State != "Active" {
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

// MergeMcpTools merges builtin tools (from the store's tool list) and the
// web-search flag into an existing McpToolSet, creating one if needed.
func MergeMcpTools(mcpToolSet *mcp.ToolSet, store *Store, webSearchEnabled bool, lang string) *mcp.ToolSet {
	if webSearchEnabled {
		if mcpToolSet == nil {
			mcpToolSet = &mcp.ToolSet{}
		}
		mcpToolSet.WebSearchEnabled = true
	}

	reg := buildMergedBuiltinRegistry(store, lang)
	allTools := reg.GetToolsAsProtocolTools()
	if len(allTools) == 0 {
		return mcpToolSet
	}

	if mcpToolSet == nil {
		return &mcp.ToolSet{
			Tools:        allTools,
			BuiltinTools: reg,
		}
	}

	mcpToolSet.Tools = append(mcpToolSet.Tools, allTools...)
	mcpToolSet.BuiltinTools = reg
	return mcpToolSet
}
