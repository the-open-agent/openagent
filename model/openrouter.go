// Copyright 2023 The OpenAgent Authors. All Rights Reserved.
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
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/casibase/go-openrouter"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/proxy"
)

type OpenRouterModelProvider struct {
	subType     string
	secretKey   string
	siteName    string
	siteUrl     string
	temperature *float32
	topP        *float32
}

func NewOpenRouterModelProvider(subType string, secretKey string, temperature float32, topP float32) (*OpenRouterModelProvider, error) {
	p := &OpenRouterModelProvider{
		subType:     subType,
		secretKey:   secretKey,
		siteName:    "OpenAgent",
		siteUrl:     "https://openagentai.org",
		temperature: &temperature,
		topP:        &topP,
	}
	return p, nil
}

func (p *OpenRouterModelProvider) GetPricing() string {
	return `URL:
https://openrouter.ai/docs#models

| Model Name                   | Prompt cost ($ per 1k tokens) | Completion cost ($ per 1k tokens) | Context (tokens) | Moderation |
|------------------------------|-------------------------------|-----------------------------------|------------------|------------|
| google/palm-2-codechat-bison | $0.00025                      | $0.0005                           | 28,672           | None       |
| google/palm-2-chat-bison     | $0.00025                      | $0.0005                           | 36,864           | None       |
| openai/gpt-3.5-turbo         | $0.001                        | $0.002                            | 4,095            | Moderated  |
| openai/gpt-3.5-turbo-16k     | $0.0005                       | $0.0015                           | 16,385           | Moderated  |
| openai/gpt-4                 | $0.03                         | $0.06                             | 8,191            | Moderated  |
| openai/gpt-4-32k             | $0.06                         | $0.12                             | 32,767           | Moderated  |
| anthropic/claude-2           | $0.008                        | $0.024                            | 200,000          | Moderated  |
| anthropic/claude-instant-v1  | $0.0008                       | $0.0024                           | 100,000          | Moderated  |
| meta-llama/llama-2-13b-chat  | $0.0007                       | $0.0009                           | 4,096            | None       |
| meta-llama/llama-2-70b-chat  | $0.0007                       | $0.0009                           | 4,096            | None       |
| palm-2-codechat-bison        | $0.00025                      | $0.0005                           | 28,672           | None       |
| palm-2-chat-bison            | $0.00025                      | $0.0005                           | 36,864           | None       |
| gpt-3.5-turbo                | $0.001                        | $0.002                            | 4,095            | Moderated  |
| gpt-3.5-turbo-16k            | $0.0005                       | $0.0015                           | 16,385           | Moderated  |
| gpt-4                        | $0.03                         | $0.06                             | 8,191            | Moderated  |
| gpt-4-32k                    | $0.06                         | $0.12                             | 32,767           | Moderated  |
| claude-2                     | $0.008                        | $0.024                            | 200,000          | Moderated  |
| claude-instant-v1            | $0.0008                       | $0.0024                           | 100,000          | Moderated  |
| llama-2-13b-chat             | $0.0007                       | $0.0009                           | 4,096            | None       |
| llama-2-70b-chat             | $0.0007                       | $0.0009                           | 4,096            | None       |
`
}

func (p *OpenRouterModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	var inputPricePerThousandTokens, outputPricePerThousandTokens float64
	priceTable := map[string][]float64{
		"google/palm-2-codechat-bison": {0.00025, 0.0005},
		"google/palm-2-chat-bison":     {0.00025, 0.0005},
		"openai/gpt-3.5-turbo":         {0.001, 0.002},
		"openai/gpt-3.5-turbo-16k":     {0.0005, 0.0015},
		"openai/gpt-4":                 {0.03, 0.06},
		"openai/gpt-4-32k":             {0.06, 0.12},
		"anthropic/claude-2":           {0.008, 0.024},
		"anthropic/claude-instant-v1":  {0.0008, 0.0024},
		"meta-llama/llama-2-13b-chat":  {0.0007, 0.0009},
		"meta-llama/llama-2-70b-chat":  {0.0007, 0.0009},
		"palm-2-codechat-bison":        {0.00025, 0.0005},
		"palm-2-chat-bison":            {0.00025, 0.0005},
		"gpt-3.5-turbo":                {0.001, 0.002},
		"gpt-3.5-turbo-16k":            {0.0005, 0.0015},
		"gpt-4":                        {0.03, 0.06},
		"gpt-4-32k":                    {0.06, 0.12},
		"claude-2":                     {0.008, 0.024},
		"claude-instant-v1":            {0.0008, 0.0024},
		"llama-2-13b-chat":             {0.0007, 0.0009},
		"llama-2-70b-chat":             {0.0007, 0.0009},
	}

	if priceItem, ok := priceTable[p.subType]; ok {
		inputPricePerThousandTokens = priceItem[0]
		outputPricePerThousandTokens = priceItem[1]
	} else {
		return fmt.Errorf(i18n.Translate(lang, "embedding:calculatePrice() error: unknown model type: %s"), p.subType)
	}

	inputPrice := getPrice(modelResult.PromptTokenCount, inputPricePerThousandTokens)
	outputPrice := getPrice(modelResult.ResponseTokenCount, outputPricePerThousandTokens)
	modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
	modelResult.Currency = "USD"
	return nil
}

func (p *OpenRouterModelProvider) getProxyClientFromToken() *openrouter.Client {
	config, err := openrouter.DefaultConfig(p.secretKey, p.siteName, p.siteUrl)
	if err != nil {
		panic(err)
	}

	config.HTTPClient = proxy.ProxyHttpClient

	c := openrouter.NewClientWithConfig(config)
	return c
}

func (p *OpenRouterModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, agentInfo *AgentInfo, lang string) (*ModelResult, error) {
	client := p.getProxyClientFromToken()

	ctx := context.Background()
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	model := p.subType
	if model == "" {
		model = openrouter.Gpt35Turbo
	}

	tokenCount, err := GetTokenSize(model, question)
	if err != nil {
		return nil, err
	}

	contextLength := getContextLength(p.subType)

	if strings.HasPrefix(question, "$OpenAgentDryRun$") {
		modelResult, err := getDefaultModelResult(model, question, "")
		if err != nil {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:cannot calculate tokens"))
		}
		if contextLength > modelResult.TotalTokenCount {
			return modelResult, nil
		} else {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:exceed max tokens"))
		}
	}

	maxTokens := contextLength - tokenCount
	if maxTokens < 0 {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:The token count: [%d] exceeds the model: [%s]'s maximum token count: [%d]"), tokenCount, model, contextLength)
	}

	temperature := p.temperature
	topP := p.topP

	respStream, err := client.CreateChatCompletionStream(
		ctx,
		&openrouter.ChatCompletionRequest{
			Model: p.subType,
			Messages: []openrouter.ChatCompletionMessage{
				{
					Role:    openrouter.ChatMessageRoleSystem,
					Content: "You are a helpful assistant.",
				},
				{
					Role:    openrouter.ChatMessageRoleUser,
					Content: question,
				},
			},
			Stream:      false,
			Temperature: temperature,
			TopP:        topP,
			MaxTokens:   maxTokens,
		},
	)
	if err != nil {
		return nil, err
	}
	defer respStream.Close()

	responseStringBuilder := strings.Builder{}

	isLeadingReturn := true
	for {
		completion, streamErr := respStream.Recv()
		if streamErr != nil {
			if streamErr == io.EOF {
				break
			}
			return nil, streamErr
		}

		data := completion.Choices[0].Message.Content
		if isLeadingReturn && len(data) != 0 {
			if strings.Count(data, "\n") == len(data) {
				continue
			} else {
				isLeadingReturn = false
			}
		}

		if _, err = fmt.Fprintf(writer, "event: message\ndata: %s\n\n", data); err != nil {
			return nil, err
		}

		// save the response for token count
		_, _ = responseStringBuilder.WriteString(data)

		flusher.Flush()
	}

	modelResult, err := getDefaultModelResult(p.subType, question, responseStringBuilder.String())
	if err != nil {
		return nil, err
	}

	err = p.calculatePrice(modelResult, lang)
	if err != nil {
		return nil, err
	}

	return modelResult, nil
}
