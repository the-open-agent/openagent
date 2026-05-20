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

package model

import (
	"io"
	"strings"
)

type GrokModelProvider struct {
	subType                      string
	secretKey                    string
	temperature                  float32
	topP                         float32
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewGrokModelProvider(subType string, secretKey string, temperature float32, topP float32, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*GrokModelProvider, error) {
	return &GrokModelProvider{
		subType:                      subType,
		secretKey:                    secretKey,
		temperature:                  temperature,
		topP:                         topP,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}, nil
}

func (p *GrokModelProvider) GetPricing() string {
	return `URL:
https://x.ai/pricing

| Models              | Context | Input (Per 1,000 tokens) | Output (Per 1,000 tokens)|
|---------------------|---------|--------------------------|--------------------------|
| grok-3              | 131K    | $0.003                   | $0.015                   |
| grok-3-fast         | 131K    | $0.005                   | $0.025                   |
| grok-3-mini         | 131K    | $0.0003                  | $0.0005                  |
| grok-3-mini-fast    | 131K    | $0.0006                  | $0.004                  |
| grok-2-vision       | 32K     | $0.002                   | $0.01                    |
| grok-2              | 131K    | $0.002                   | $0.01                    |

Image models:

| Models               | Price (per image) |
|----------------------|-------------------|
| grok-2-image         | $0.07             |
`
}

func (p *GrokModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	if applyConfiguredPerThousandTokenPrices(p.inputPricePerThousandTokens, p.outputPricePerThousandTokens, pickCurrency(p.currency, "USD"), modelResult) {
		return nil
	}

	var inputPricePerThousandTokens, outputPricePerThousandTokens float64

	if strings.Contains(p.subType, "grok-4") || strings.Contains(p.subType, "grok-3") {
		if !strings.Contains(p.subType, "fast") && !strings.Contains(p.subType, "mini") {
			inputPricePerThousandTokens = 0.003  // $0.003 per 1,000 tokens
			outputPricePerThousandTokens = 0.015 // $0.015 per 1,000 tokens
		} else if strings.Contains(p.subType, "mini-fast") {
			inputPricePerThousandTokens = 0.0006 // $0.0006 per 1,000 tokens
			outputPricePerThousandTokens = 0.004 // $0.004 per 1,000 tokens
		} else if strings.Contains(p.subType, "fast") {
			inputPricePerThousandTokens = 0.005  // $0.005 per 1,000 tokens
			outputPricePerThousandTokens = 0.025 // $0.025 per 1,000 tokens
		} else if strings.Contains(p.subType, "mini") {
			inputPricePerThousandTokens = 0.0003  // $0.0003 per 1,000 tokens
			outputPricePerThousandTokens = 0.0005 // $0.0005 per 1,000 tokens
		}
	} else if strings.Contains(p.subType, "grok-2-vision") {
		inputPricePerThousandTokens = 0.002 // $0.002 per 1,000 tokens
		outputPricePerThousandTokens = 0.01 // $0.01 per 1,000 tokens
	} else if strings.Contains(p.subType, "grok-2-image") {
		// For image generation, we need special handling
		modelResult.TotalPrice = float64(modelResult.ImageCount) * 0.07 // $0.07 per image
		modelResult.Currency = "USD"
		return nil
	} else if strings.Contains(p.subType, "grok-2") {
		inputPricePerThousandTokens = 0.002 // $0.002 per 1,000 tokens
		outputPricePerThousandTokens = 0.01 // $0.01 per 1,000 tokens
	} else {
		// Don't fail hard on unknown models.
		modelResult.TotalPrice = 0
		modelResult.Currency = "USD"
		return nil
	}

	inputPrice := getPrice(modelResult.PromptTokenCount, inputPricePerThousandTokens)
	outputPrice := getPrice(modelResult.ResponseTokenCount, outputPricePerThousandTokens)
	modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
	modelResult.Currency = "USD"
	return nil
}

func (p *GrokModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	// Create a LocalModelProvider to handle the request
	const BaseUrl = "https://api.x.ai/v1"
	localProvider, err := NewLocalModelProvider("Custom", "custom-model", p.secretKey, p.temperature, p.topP, 0, 0, BaseUrl, p.subType, 0, 0, "USD")
	if err != nil {
		return nil, err
	}

	modelResult, err := localProvider.QueryText(question, writer, history, prompt, knowledgeMessages, toolSession, lang)
	if err != nil {
		return nil, err
	}

	err = p.calculatePrice(modelResult, lang)
	if err != nil {
		return nil, err
	}

	return modelResult, nil
}
