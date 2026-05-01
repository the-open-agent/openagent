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

	"github.com/the-open-agent/openagent/agent"
	"github.com/the-open-agent/openagent/agent/builtin_tool"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/tool"
	"github.com/the-open-agent/openagent/util"
)

func buildAgentClientsForTool(toolName string, lang string) (*agent.AgentClients, error) {
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

	reg := builtin_tool.NewToolRegistry()
	for _, t := range tp.BuiltinTools() {
		reg.RegisterTool(t)
	}

	allTools := reg.GetToolsAsProtocolTools()
	if len(allTools) == 0 {
		return nil, nil
	}

	return &agent.AgentClients{
		Tools:          allTools,
		BuiltinToolReg: reg,
	}, nil
}

func GetAnswerWithTool(modelProviderName, toolName, question, lang string) (string, *model.ModelResult, error) {
	_, modelProviderObj, err := GetModelProviderFromContext("admin", modelProviderName, lang)
	if err != nil {
		return "", nil, err
	}

	agentClients, err := buildAgentClientsForTool(toolName, lang)
	if err != nil {
		return "", nil, err
	}

	prompt := "You are an expert in your field and you specialize in using your knowledge to answer or solve people's problems."
	history := []*model.RawMessage{}
	knowledge := []*model.RawMessage{}

	var writer MyWriter
	var modelResult *model.ModelResult

	if agentClients != nil {
		messages := &model.AgentMessages{
			Messages:  []*model.RawMessage{},
			ToolCalls: nil,
		}
		agentInfo := &model.AgentInfo{
			AgentClients:  agentClients,
			AgentMessages: messages,
		}
		modelResult, err = model.QueryTextWithTools(modelProviderObj, question, &writer, history, prompt, knowledge, agentInfo, lang)
	} else {
		modelResult, err = modelProviderObj.QueryText(question, &writer, history, prompt, knowledge, nil, lang)
	}
	if err != nil {
		return "", nil, err
	}

	res := writer.String()
	res = strings.Trim(res, "\"")
	return res, modelResult, nil
}
