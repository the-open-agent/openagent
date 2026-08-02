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

package model

import (
	"context"
	"io"
	"net/http"
	"strings"

	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/proxy"
)

// OrcaRouterModelProvider is an OpenAI-compatible gateway provider that routes
// requests through OrcaRouter (https://www.orcarouter.ai). It mirrors the
// OpenRouter provider wiring but talks to https://api.orcarouter.ai/v1.
type OrcaRouterModelProvider struct {
	subType     string
	secretKey   string
	siteName    string
	siteUrl     string
	temperature *float32
	topP        *float32
}

func NewOrcaRouterModelProvider(subType string, secretKey string, temperature float32, topP float32) (*OrcaRouterModelProvider, error) {
	p := &OrcaRouterModelProvider{
		subType:     subType,
		secretKey:   secretKey,
		siteName:    "OpenAgent",
		siteUrl:     "https://openagentai.org",
		temperature: &temperature,
		topP:        &topP,
	}
	return p, nil
}

func (p *OrcaRouterModelProvider) GetPricing() string {
	return `URL:
https://www.orcarouter.ai/models

| Model Name                     | Prompt cost ($ per 1M tokens) | Completion cost ($ per 1M tokens) | Context (tokens) |
|--------------------------------|-------------------------------|-----------------------------------|------------------|
| orcarouter/auto                | routed                        | routed                            | routed           |
| openai/gpt-5.5                 | $5.00                         | $30.00                            | 1,050,000        |
| anthropic/claude-opus-5        | $5.00                         | $25.00                            | 1,000,000        |
| anthropic/claude-sonnet-5      | $2.00                         | $10.00                            | 1,000,000        |
| google/gemini-3.5-flash        | $1.50                         | $9.00                             | 1,048,576        |
| deepseek/deepseek-v4-pro       | $0.44                         | $0.88                             | 1,048,576        |
| grok/grok-4.3                  | $1.25                         | $2.50                             | 1,000,000        |
| qwen/qwen3-max                 | $0.36                         | $1.43                             | 262,144          |
| minimax/minimax-m2.7           | $0.30                         | $1.20                             | 204,800          |
`
}

func (p *OrcaRouterModelProvider) getClientFromToken() *openai.Client {
	config := openai.DefaultConfig(p.secretKey)
	config.BaseURL = "https://api.orcarouter.ai/v1"

	httpClient := proxy.ProxyHttpClient
	if httpClient == nil {
		httpClient = &http.Client{}
	}
	config.HTTPClient = &attributionHTTPClient{client: httpClient, siteName: p.siteName, siteUrl: p.siteUrl}

	return openai.NewClientWithConfig(config)
}

// attributionHTTPClient injects the OpenRouter-style attribution headers
// (HTTP-Referer / X-Title) on every request so OrcaRouter can attribute
// traffic back to OpenAgent.
type attributionHTTPClient struct {
	client   *http.Client
	siteName string
	siteUrl  string
}

func (c *attributionHTTPClient) Do(req *http.Request) (*http.Response, error) {
	req.Header.Set("HTTP-Referer", c.siteUrl)
	req.Header.Set("X-Title", c.siteName)
	return c.client.Do(req)
}

func (p *OrcaRouterModelProvider) ListModels() ([]string, error) {
	return openaiCompatibleListModels("orcarouter", p.secretKey, "https://api.orcarouter.ai/v1")
}

func (p *OrcaRouterModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	client := p.getClientFromToken()

	ctx := context.Background()

	model := p.subType
	if model == "" {
		model = "orcarouter/auto"
	}

	temperature := p.temperature
	topP := p.topP

	maxTokens := getContextLength(model)

	modelResult := &ModelResult{}
	rawMessages, err := OpenaiGenerateMessages(prompt, question, history, knowledgeMessages, model, maxTokens, lang)
	if err != nil {
		return nil, err
	}
	if toolSession != nil && toolSession.ToolMessages != nil && toolSession.ToolMessages.Messages != nil {
		rawMessages = append(rawMessages, toolSession.ToolMessages.Messages...)
	}

	var messages []openai.ChatCompletionMessage
	if IsVisionModel(model) {
		messages, err = OpenaiRawMessagesToGptVisionMessages(rawMessages)
		if err != nil {
			return nil, err
		}
	} else {
		messages = OpenaiRawMessagesToMessages(rawMessages)
	}

	promptTokenCount, err := OpenaiNumTokensFromMessages(messages, model)
	if err != nil {
		return nil, err
	}

	modelResult.PromptTokenCount = promptTokenCount
	modelResult.TotalTokenCount = modelResult.PromptTokenCount + modelResult.ResponseTokenCount
	err = CalculateOpenAIModelPrice(model, modelResult, lang)
	if err != nil {
		return nil, err
	}

	if strings.HasPrefix(question, "$OpenAgentDryRun$") {
		return modelResult, nil
	}

	req := ChatCompletionRequest(model, messages, *temperature, *topP, 0, 0)
	if toolSession != nil && toolSession.McpToolSet != nil {
		tools, err := reverseToolsToOpenAi(toolSession.McpToolSet.Tools)
		if err != nil {
			return nil, err
		}
		req.Tools = tools
		req.ToolChoice = "auto"
	}

	respStream, err := client.CreateChatCompletionStream(
		ctx,
		req,
	)
	if err != nil {
		return nil, err
	}
	defer respStream.Close()

	isLeadingReturn := true
	var (
		answerData    strings.Builder
		reasoningData strings.Builder
		toolCalls     []openai.ToolCall
		toolCallsMap  map[int]int
	)

	for {
		completion, streamErr := respStream.Recv()
		if streamErr != nil {
			if streamErr == io.EOF {
				break
			}
			return nil, streamErr
		}

		if len(completion.Choices) == 0 {
			continue
		}
		if completion.Choices[0].Delta.ToolCalls != nil {
			for _, toolCall := range completion.Choices[0].Delta.ToolCalls {
				index := 0
				if toolCall.Index != nil {
					index = *toolCall.Index
				}
				if err = flushToolCallDelta(index, toolCall.ID, toolCall.Function.Name, toolCall.Function.Arguments, writer, lang); err != nil {
					return nil, err
				}
				toolCalls, toolCallsMap = handleToolCallsParameters(toolCall, toolCalls, toolCallsMap)
			}
		}

		// Handle both reasoning content and regular content (mirrors the
		// "Custom-think" branch of LocalModelProvider so reasoning models like
		// deepseek/deepseek-reasoner stream their thinking out too).
		if completion.Choices[0].Delta.ReasoningContent != "" {
			data := completion.Choices[0].Delta.ReasoningContent
			reasoningData.WriteString(data)
			err = flushDataThink(data, "reason", writer, lang)
			if err != nil {
				return nil, err
			}
		}

		if completion.Choices[0].Delta.Content != "" {
			data := completion.Choices[0].Delta.Content
			if isLeadingReturn && len(data) != 0 {
				if strings.Count(data, "\n") == len(data) {
					continue
				} else {
					isLeadingReturn = false
				}
			}

			err = flushDataThink(data, "message", writer, lang)
			if err != nil {
				return nil, err
			}

			answerData.WriteString(data)
		}
	}

	if toolSession != nil && toolSession.ToolMessages != nil {
		toolSession.ToolMessages.ReasoningContent = reasoningData.String()
		toolSession.ToolMessages.ToolCalls = toolCalls
	}

	responseTokenCount, err := GetTokenSize(model, answerData.String())
	if err != nil {
		return nil, err
	}

	modelResult.ResponseTokenCount += responseTokenCount
	modelResult.TotalTokenCount = modelResult.PromptTokenCount + modelResult.ResponseTokenCount
	err = CalculateOpenAIModelPrice(model, modelResult, lang)
	if err != nil {
		return nil, err
	}
	return modelResult, nil
}
