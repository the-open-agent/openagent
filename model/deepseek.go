// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
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

type DeepSeekProvider struct {
	subType                      string
	apiKey                       string
	temperature                  float32
	topP                         float32
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewDeepSeekProvider(subType string, apiKey string, temperature float32, topP float32, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*DeepSeekProvider, error) {
	return &DeepSeekProvider{
		subType:                      subType,
		apiKey:                       apiKey,
		temperature:                  temperature,
		topP:                         topP,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}, nil
}

func (p *DeepSeekProvider) GetPricing() string {
	return `URL:
https://api-docs.deepseek.com/zh-cn/quick_start/pricing

| Model          | sub-type           | Input Price per 1K tokens | Output Price per 1K tokens |
|----------------|--------------------|---------------------------|----------------------------|
| DeepSeek-V4-Pro  | deepseek-v4-pro    | 0.003 yuan/1,000 tokens   | 0.006 yuan/1,000 tokens    |
| DeepSeek-V4-Flash| deepseek-v4-flash  | 0.001 yuan/1,000 tokens   | 0.002 yuan/1,000 tokens    |
| DeepSeek-V3.2  | deepseek-chat      | 0.001 yuan/1,000 tokens   | 0.002 yuan/1,000 tokens    |
| DeepSeek-V3.2  | deepseek-reasoner  | 0.003 yuan/1,000 tokens   | 0.006 yuan/1,000 tokens    |
`
}

func (p *DeepSeekProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	if applyConfiguredPerThousandTokenPrices(p.inputPricePerThousandTokens, p.outputPricePerThousandTokens, pickCurrency(p.currency, "CNY"), modelResult) {
		return nil
	}

	price := 0.0
	priceTable := map[string][2]float64{
		"deepseek-v4-pro":   {0.003, 0.006},
		"deepseek-v4-flash": {0.001, 0.002},
		"deepseek-chat":     {0.001, 0.002},
		"deepseek-reasoner": {0.003, 0.006},
	}

	var priceItem [2]float64
	var ok bool
	if priceItem, ok = priceTable[p.subType]; ok {
		// use priceItem
	} else {
		lower := strings.ToLower(p.subType)
		switch {
		case strings.Contains(lower, "reasoner") || strings.Contains(lower, "r1"):
			priceItem = [2]float64{0.003, 0.006}
			ok = true
		case strings.Contains(lower, "flash"):
			priceItem = [2]float64{0.001, 0.002}
			ok = true
		case strings.Contains(lower, "deepseek"):
			priceItem = [2]float64{0.001, 0.002}
			ok = true
		}
	}

	if ok {
		inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
		outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
		price = inputPrice + outputPrice
	} else {
		modelResult.TotalPrice = 0
		modelResult.Currency = "CNY"
		return nil
	}

	modelResult.TotalPrice = price
	modelResult.Currency = "CNY"
	return nil
}

func (p *DeepSeekProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	const BaseUrl = "https://api.deepseek.com/v1"

	var localType string
	switch p.subType {
	case "deepseek-v4-pro", "deepseek-reasoner":
		localType = "Custom-think"
	case "deepseek-v4-flash":
		localType = "Custom-think"
	case "deepseek-chat":
		localType = "Custom"
	default:
		localType = "Custom-think"
	}
	localProvider, err := NewLocalModelProvider(localType, "custom-model", p.apiKey, p.temperature, p.topP, 0, 0, BaseUrl, p.subType, 0, 0, "CNY")
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
