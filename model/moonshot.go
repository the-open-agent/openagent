// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
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

type MoonshotModelProvider struct {
	temperature                  float32
	subType                      string
	secretKey                    string
	topP                         float32
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewMoonshotModelProvider(subType string, secretKey string, temperature float32, topP float32, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*MoonshotModelProvider, error) {
	client := &MoonshotModelProvider{
		subType:                      subType,
		secretKey:                    secretKey,
		temperature:                  temperature,
		topP:                         topP,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}
	return client, nil
}

func (p *MoonshotModelProvider) GetPricing() string {
	return `URL: 
https://platform.moonshot.cn/docs/pricing/chat

Model

| Model                  | Unit Of Charge | Input Price | Output Price |
|------------------------|----------------|-------------|--------------|
| moonshot-v1-8k         | 1M tokens      | 2 yuan      | 10 yuan      |
| moonshot-v1-32k        | 1M tokens      | 5 yuan      | 20 yuan      |
| moonshot-v1-128k       | 1M tokens      | 10 yuan     | 30 yuan      |
| kimi-k2-0905-preview   | 1M tokens      | 4 yuan      | 16 yuan      |
| kimi-k2-0711-preview   | 1M tokens      | 4 yuan      | 16 yuan      |
| kimi-k2-turbo-preview  | 1M tokens      | 8 yuan      | 58 yuan      |
| kimi-k2-thinking       | 1M tokens      | 4 yuan      | 16 yuan      |
| kimi-k2-thinking-turbo | 1M tokens      | 8 yuan      | 58 yuan      |
| kimi-latest            | 1M tokens      | Auto (Tier) | Auto (Tier)  |
`
}

func (p *MoonshotModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	if applyConfiguredPerThousandTokenPrices(p.inputPricePerThousandTokens, p.outputPricePerThousandTokens, pickCurrency(p.currency, "CNY"), modelResult) {
		return nil
	}

	price := 0.0
	priceTable := map[string][2]float64{
		"moonshot-v1-8k":   {0.002, 0.010},
		"moonshot-v1-32k":  {0.005, 0.020},
		"moonshot-v1-128k": {0.010, 0.030},

		"kimi-k2-0905-preview": {0.004, 0.016},
		"kimi-k2-0711-preview": {0.004, 0.016},
		"kimi-k2-thinking":     {0.004, 0.016},

		"kimi-k2-turbo-preview":  {0.008, 0.058},
		"kimi-k2-thinking-turbo": {0.008, 0.058},
	}

	var priceItem [2]float64
	var ok bool

	if p.subType == "kimi-latest" {
		if modelResult.TotalTokenCount <= 8192 {
			priceItem = [2]float64{0.002, 0.010}
		} else if modelResult.TotalTokenCount <= 32768 {
			priceItem = [2]float64{0.005, 0.020}
		} else {
			priceItem = [2]float64{0.010, 0.030}
		}
		ok = true
	} else {
		priceItem, ok = priceTable[p.subType]
	}

	if ok {
		inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
		outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
		price = inputPrice + outputPrice
	} else {
		lower := strings.ToLower(p.subType)
		if strings.Contains(lower, "kimi-k2") || strings.Contains(lower, "kimi_k2") {
			if strings.Contains(lower, "turbo") {
				priceItem = [2]float64{0.008, 0.058}
			} else {
				priceItem = [2]float64{0.004, 0.016}
			}
			inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
			outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
			price = inputPrice + outputPrice
		} else if strings.Contains(lower, "kimi") || strings.Contains(lower, "moonshot") {
			priceItem = [2]float64{0.004, 0.016}
			inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
			outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
			price = inputPrice + outputPrice
		} else {
			modelResult.TotalPrice = 0
			modelResult.Currency = "CNY"
			return nil
		}
	}

	modelResult.TotalPrice = price
	modelResult.Currency = "CNY"
	return nil
}

func (p *MoonshotModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	const BaseUrl = "https://api.moonshot.cn/v1"

	localProvider, err := NewLocalModelProvider("Custom-think", "custom-model", p.secretKey, p.temperature, p.topP, 0, 0, BaseUrl, p.subType, 0, 0, "CNY")
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
