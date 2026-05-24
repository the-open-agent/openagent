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

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/proxy"
)

type ClaudeModelProvider struct {
	subType        string
	secretKey      string
	budgetTokens   int
	enableThinking bool
}

func NewClaudeModelProvider(subType string, secretKey string, enableThinking bool, budgetTokens int) (*ClaudeModelProvider, error) {
	return &ClaudeModelProvider{subType: subType, secretKey: secretKey, enableThinking: enableThinking, budgetTokens: budgetTokens}, nil
}

func (p *ClaudeModelProvider) GetPricing() string {
	return `URL:
https://docs.anthropic.com/en/docs/about-claude/pricing

| Model family        | Context window | Input Pricing         | Output Pricing        |
|---------------------|----------------|-----------------------|-----------------------|
| Claude Opus 4.7     | 1,000,000 tokens| $5.00/million tokens  | $25.00/million tokens |
| Claude Opus 4.5     | 200,000 tokens | $5.00/million tokens  | $25.00/million tokens |
| Claude Opus 4.1     | 200,000 tokens | $15.00/million tokens | $75.00/million tokens |
| Claude Opus 4       | 200,000 tokens | $15.00/million tokens | $75.00/million tokens |
| Claude Sonnet 4     | 200,000 tokens | $3.00/million tokens  | $15.00/million tokens |
| Claude Sonnet 3.7   | 200,000 tokens | $3.00/million tokens  | $15.00/million tokens |
| Claude Sonnet 3.5   | 200,000 tokens | $3.00/million tokens  | $15.00/million tokens |
| Claude Haiku 3.5    | 200,000 tokens | $0.80/million tokens  | $4.00/million tokens  |
| Claude Opus 3       | 200,000 tokens | $15.00/million tokens | $75.00/million tokens |
| Claude Haiku 3      | 200,000 tokens | $0.25/million tokens  | $1.25/million tokens  |
`
}

func (p *ClaudeModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	var inputPricePerThousandTokens, outputPricePerThousandTokens float64
	priceTable := map[string][]float64{
		"claude-opus-4-7":            {0.005, 0.025},
		"claude-opus-4-5":            {0.005, 0.025},
		"claude-opus-4-1":            {0.015, 0.075},
		"claude-opus-4-0":            {0.015, 0.075},
		"claude-opus-4-20250514":     {0.015, 0.075},
		"claude-4-opus-20250514":     {0.015, 0.075},
		"claude-sonnet-4-0":          {0.003, 0.015},
		"claude-sonnet-4-20250514":   {0.003, 0.015},
		"claude-4-sonnet-20250514":   {0.003, 0.015},
		"claude-3-7-sonnet-latest":   {0.003, 0.015},
		"claude-3-7-sonnet-20250219": {0.003, 0.015},
		"claude-3-5-haiku-latest":    {0.0008, 0.004},
		"claude-3-5-haiku-20241022":  {0.0008, 0.004},
		"claude-3-5-sonnet-latest":   {0.003, 0.015},
		"claude-3-opus-latest":       {0.015, 0.075},
		"claude-3-haiku-20240307":    {0.00025, 0.00125},
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

func (p *ClaudeModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	client := anthropic.NewClient(
		option.WithAPIKey(p.secretKey),
		option.WithHTTPClient(proxy.ProxyHttpClient),
	)

	if strings.HasPrefix(question, "$OpenAgentDryRun$") {
		modelResult, err := getDefaultModelResult(p.subType, question, "")
		if err != nil {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:cannot calculate tokens"))
		}
		if getContextLength(p.subType) > modelResult.TotalTokenCount {
			return modelResult, nil
		} else {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:exceed max tokens"))
		}
	}

	maxTokens := getContextLength(p.subType)

	var textBlockList []anthropic.TextBlockParam
	systemMessages := getSystemMessages(prompt, knowledgeMessages)
	for _, systemMessage := range systemMessages {
		textBlockList = append(textBlockList, anthropic.TextBlockParam{
			Text: systemMessage.Text,
			Type: "text",
		})
	}

	messages := []anthropic.MessageParam{}
	for i := len(history) - 1; i >= 0; i-- {
		historyMessage := history[i]
		messages = append(messages, anthropic.NewAssistantMessage(anthropic.NewTextBlock(historyMessage.Text)))
	}
	messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock(question)))

	messageParams := anthropic.MessageNewParams{
		MaxTokens:     int64(maxTokens),
		Messages:      messages,
		Model:         anthropic.Model(p.subType),
		StopSequences: []string{"```\n"},
		System:        textBlockList,
	}
	if p.enableThinking {
		messageParams.Thinking = anthropic.ThinkingConfigParamUnion{
			OfEnabled: &anthropic.ThinkingConfigEnabledParam{
				BudgetTokens: int64(p.budgetTokens),
			},
		}
	}
	stream := client.Messages.NewStreaming(context.TODO(), messageParams)

	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	flushData := func(event string, data string) error {
		if _, err := fmt.Fprintf(writer, "event: %s\ndata: %s\n\n", event, data); err != nil {
			return err
		}
		flusher.Flush()
		return nil
	}

	modelResult := &ModelResult{}
	for stream.Next() {
		event := stream.Current()

		switch eventVariant := event.AsAny().(type) {
		case anthropic.MessageStartEvent:
			inputTokens := int(eventVariant.Message.Usage.InputTokens)
			modelResult.PromptTokenCount = inputTokens
		case anthropic.ContentBlockDeltaEvent:
			switch deltaVariant := eventVariant.Delta.AsAny().(type) {
			case anthropic.ThinkingDelta:
				err := flushData("reason", deltaVariant.Thinking)
				if err != nil {
					return nil, err
				}
			case anthropic.TextDelta:
				err := flushData("message", deltaVariant.Text)
				if err != nil {
					return nil, err
				}
			}
		case anthropic.MessageDeltaEvent:
			outputTokens := int(eventVariant.Usage.OutputTokens)
			modelResult.ResponseTokenCount = outputTokens
		}
	}

	if stream.Err() != nil {
		return nil, stream.Err()
	}
	modelResult.TotalTokenCount = modelResult.PromptTokenCount + modelResult.ResponseTokenCount

	err := p.calculatePrice(modelResult, lang)
	if err != nil {
		return nil, err
	}

	return modelResult, nil
}
