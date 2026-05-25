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

package tool

import (
	"context"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/the-open-agent/openagent/tool/builtin_tool"
)

// SkillLoader loads prompt-ready skill content for one skill and optional reference.
type SkillLoader interface {
	Load(owner string, allowedSkillNames []string, skillName string, referenceName string) (string, error)
}

// SkillTool exposes builtin skill-loading tools. It is configured per-store by
// directly registering builtins with a bound loader and allowed skill list.
type SkillTool struct{}

func (t *SkillTool) BuiltinTools() []BuiltinTool {
	return nil
}

func NewLoadSkillBuiltin(owner string, allowedSkillNames []string, loader SkillLoader) builtin_tool.BuiltinTool {
	if owner == "" || loader == nil {
		return nil
	}
	return &loadSkillBuiltin{
		owner:             owner,
		allowedSkillNames: allowedSkillNames,
		loader:            loader,
	}
}

type loadSkillBuiltin struct {
	owner             string
	allowedSkillNames []string
	loader            SkillLoader
}

func (t *loadSkillBuiltin) GetName() string {
	return "load_skill"
}

func (t *loadSkillBuiltin) GetDescription() string {
	return "Load the full instructions for one available skill, and optionally one specific reference file from that skill. For website-type skills, load automatically when the target URL/domain matches and reuse stored element positions from the skill content."
}

func (t *loadSkillBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"skill": map[string]interface{}{
				"type":        "string",
				"description": "The skill name to load from the current store's available skills catalog.",
			},
			"reference": map[string]interface{}{
				"type":        "string",
				"description": "Optional reference file name inside the skill to load together with the skill content.",
			},
		},
		"required": []string{"skill"},
	}
}

func (t *loadSkillBuiltin) Execute(_ context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	if t.loader == nil || t.owner == "" {
		return skillToolError("skill loader context is missing"), nil
	}

	skillName, _ := arguments["skill"].(string)
	referenceName, _ := arguments["reference"].(string)
	if skillName == "" {
		return skillToolError("missing required parameter: skill"), nil
	}

	content, err := t.loader.Load(t.owner, t.allowedSkillNames, skillName, referenceName)
	if err != nil {
		return skillToolError(err.Error()), nil
	}

	return skillToolText(content), nil
}

func skillToolText(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: false,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}

func skillToolError(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: true,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}
