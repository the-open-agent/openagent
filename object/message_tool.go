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
	"strings"

	"github.com/the-open-agent/openagent/mcp"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/tool"
	"github.com/the-open-agent/openagent/util"
)

const shellToolPrompt = `
You have access to tools. Use them when they are needed to answer with live or local data, but do not call tools unnecessarily.

For local machine/server/system/file/directory/network/port/process/dependency version/build/test/log/config/Git/Docker/database client questions, including 本机, 当前系统, 系统, 文件, 目录, 网络, 端口, 进程, 版本, 依赖, 构建, 测试, 日志, 配置, Git, Docker, 数据库客户端, you must call shell when it is available before answering. If the question can be solved with a shell command, call shell with action=raw_command and write the command in the command argument. Generate commands for the current platform; on Windows prefer cmd or PowerShell-compatible commands. Do not answer these local-data questions with generic instructions or example commands unless the relevant tool call fails. If shell/raw_command fails, inspect stdout, stderr, exitCode, and timedOut, then rewrite and retry the command up to 2 times. If it still fails, explain the attempted commands, failure reason, and next step.`

func AppendToolUsagePrompt(prompt string) string {
	if strings.Contains(prompt, "action=raw_command") {
		return prompt
	}
	return prompt + "\n" + shellToolPrompt
}

func buildToolSetForBuiltinTool(toolName string, lang string) (*mcp.ToolSet, error) {
	if toolName == "" {
		return nil, nil
	}

	id := util.GetIdFromOwnerAndName("admin", toolName)
	t, err := GetTool(id)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, nil
	}

	tp, err := tool.New(getToolConfig(t), lang)
	if err != nil {
		return nil, err
	}

	reg := tool.NewToolRegistry()
	for _, t := range tp.BuiltinTools() {
		reg.RegisterTool(t)
	}

	allTools := reg.GetToolsAsProtocolTools()
	if len(allTools) == 0 {
		return nil, nil
	}

	return &mcp.ToolSet{
		Tools:        allTools,
		BuiltinTools: reg,
	}, nil
}

func GetAnswerWithTool(modelProviderName, toolName, question, lang string) (string, *model.ModelResult, error) {
	_, modelProviderObj, err := GetModelProviderFromContext("admin", modelProviderName, lang)
	if err != nil {
		return "", nil, err
	}

	mcpToolSet, err := buildToolSetForBuiltinTool(toolName, lang)
	if err != nil {
		return "", nil, err
	}

	prompt := AppendToolUsagePrompt("You are an expert in your field and you specialize in using your knowledge to answer or solve people's problems.")
	history := []*model.RawMessage{}
	knowledge := []*model.RawMessage{}

	var writer MyWriter
	var modelResult *model.ModelResult

	if mcpToolSet != nil {
		messages := &model.ToolMessages{
			Messages:  []*model.RawMessage{},
			ToolCalls: nil,
		}
		toolSession := &model.ToolSession{
			McpToolSet:   mcpToolSet,
			ToolMessages: messages,
		}
		modelResult, err = model.QueryTextWithTools(modelProviderObj, question, &writer, history, prompt, knowledge, toolSession, lang)
	} else {
		modelResult, err = modelProviderObj.QueryText(question, &writer, history, prompt, knowledge, nil, lang)
	}
	if err != nil {
		return "", nil, err
	}
	if modelResult != nil {
		modelResult.ToolCalls = model.GetToolCallsFromWriter(writer.ToolString())
	}

	res := writer.String()
	res = strings.Trim(res, "\"")
	return res, modelResult, nil
}
