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

package controllers

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// ChatCompletions implements the OpenAI-compatible chat completions API
// @Title ChatCompletions
// @Tag OpenAI Compatible API
// @Description OpenAI compatible chat completions API
// @Param   body    body    openai.ChatCompletionRequest  true    "The OpenAI chat request"
// @Success 200 {object} openai.ChatCompletionResponse
// @router /api/chat/completions [post]
func (c *ApiController) ChatCompletions() {
	auth := c.Ctx.Request.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		c.ResponseError(c.T("openai:Invalid API key format. Expected 'Bearer API_KEY'"))
		return
	}
	apiKey := strings.TrimPrefix(auth, "Bearer ")

	var request openai.ChatCompletionRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(fmt.Sprintf("Failed to parse request: %s", err.Error()))
		return
	}

	question, systemPrompt, history, err := parseOpenAIMessages(request.Messages)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	store, err := object.GetStoreByApiKey(apiKey)
	if err != nil {
		c.ResponseError(fmt.Sprintf("Authentication failed: %s", err.Error()))
		return
	}
	if store != nil {
		c.chatCompletionsViaStore(store, request, question, systemPrompt, history)
		return
	}

	modelProvider, err := object.GetModelProviderByProviderKey(apiKey, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseError(fmt.Sprintf("Authentication failed: %s", err.Error()))
		return
	}
	c.chatCompletionsViaProvider(modelProvider, request, question, systemPrompt, history)
}

// chatCompletionsViaStore calls the model through a Store and persists chat + messages.
func (c *ApiController) chatCompletionsViaStore(store *object.Store, request openai.ChatCompletionRequest, question, systemPrompt string, history []*model.RawMessage) {
	lang := c.GetAcceptLanguage()
	requestId := util.GenerateUUID()

	modelProviderRecord, err := object.GetProviderFromName(store.Owner, store.ModelProvider, lang)
	if err != nil || modelProviderRecord == nil {
		c.ResponseError(fmt.Sprintf("Store model provider not found: %s", store.ModelProvider))
		return
	}
	modelProviderObj, err := modelProviderRecord.GetModelProvider(lang)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	prompt := store.Prompt
	if systemPrompt != "" {
		prompt = systemPrompt
	}

	chat, _, aiMsg, err := createApiChatSession(store, modelProviderRecord.Name, question, requestId)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	writer := newOpenAIWriter(c.Ctx.ResponseWriter, request, requestId)

	mcpToolSet, err := object.GetServerMcpToolSet(store.Owner, store.McpServer, lang)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	origin := getOriginFromHost(c.Ctx.Request.Host)
	mcpToolSet = object.MergeMcpTools(mcpToolSet, store, false, "api", origin, lang)

	var modelResult *model.ModelResult
	if mcpToolSet != nil && (len(mcpToolSet.Tools) > 0 || mcpToolSet.WebSearchEnabled) {
		toolSession := &model.ToolSession{
			McpToolSet: mcpToolSet,
			ToolMessages: &model.ToolMessages{
				Messages:  []*model.RawMessage{},
				ToolCalls: nil,
			},
			IsVision: model.IsVisionModel(modelProviderRecord.SubType),
		}
		modelResult, err = model.QueryTextWithTools(modelProviderObj, question, writer, history, prompt, []*model.RawMessage{}, toolSession, lang)
	} else {
		modelResult, err = modelProviderObj.QueryText(question, writer, history, prompt, []*model.RawMessage{}, nil, lang)
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if err = applyResultToApiSession(aiMsg, chat, writer, modelResult); err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.sendOpenAIResponse(writer, request, requestId, modelResult)
}

// chatCompletionsViaProvider calls the model directly through a Provider without recording.
func (c *ApiController) chatCompletionsViaProvider(modelProvider model.ModelProvider, request openai.ChatCompletionRequest, question, systemPrompt string, history []*model.RawMessage) {
	requestId := util.GenerateUUID()
	writer := newOpenAIWriter(c.Ctx.ResponseWriter, request, requestId)

	modelResult, err := modelProvider.QueryText(question, writer, history, systemPrompt, []*model.RawMessage{}, nil, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.sendOpenAIResponse(writer, request, requestId, modelResult)
}

// sendOpenAIResponse writes the final OpenAI-format response (streaming close or full JSON body).
func (c *ApiController) sendOpenAIResponse(writer *OpenAIWriter, request openai.ChatCompletionRequest, requestId string, modelResult *model.ModelResult) {
	if request.Stream {
		if err := writer.Close(modelResult.PromptTokenCount, modelResult.ResponseTokenCount, modelResult.TotalTokenCount); err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.EnableRender = false
		return
	}

	response := openai.ChatCompletionResponse{
		ID:      "chatcmpl-" + requestId,
		Object:  "chat.completion",
		Created: util.GetCurrentUnixTime(),
		Model:   request.Model,
		Choices: []openai.ChatCompletionChoice{
			{
				Index: 0,
				Message: openai.ChatCompletionMessage{
					Role:    "assistant",
					Content: writer.MessageString(),
				},
				FinishReason: openai.FinishReasonStop,
			},
		},
		Usage: openai.Usage{
			PromptTokens:     modelResult.PromptTokenCount,
			CompletionTokens: modelResult.ResponseTokenCount,
			TotalTokens:      modelResult.TotalTokenCount,
		},
	}
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.Ctx.Output.Header("Content-Type", "application/json")
	c.Ctx.Output.Body(jsonResponse)
	c.EnableRender = false
}
