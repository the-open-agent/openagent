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
	"fmt"
	"io"

	"github.com/the-open-agent/openagent/i18n"
)

type MiniMaxModelProvider struct {
	subType     string
	apiKey      string
	temperature float32
}

func NewMiniMaxModelProvider(subType string, groupID string, apiKey string, temperature float32) (*MiniMaxModelProvider, error) {
	return &MiniMaxModelProvider{
		subType:     subType,
		apiKey:      apiKey,
		temperature: temperature,
	}, nil
}

func (p *MiniMaxModelProvider) GetPricing() string {
	return `URL:
	https://platform.minimax.io/subscribe/overview

	| Model                   | Context  | Input Price         | Output Price        |
	|-------------------------|----------|---------------------|---------------------|
	| minimax-m2.7            | 205K     | $0.30/1M tokens     | $1.20/1M tokens     |
	| minimax-m2.5-lightning  | 200K     | $0.30/1M tokens     | $2.40/1M tokens     |
	| minimax-m2.5-standard   | 200K     | $0.15/1M tokens     | $1.20/1M tokens     |
	| minimax-m2.1            | 200K     | $0.30/1M tokens     | $1.20/1M tokens     |
	| MiniMax-Text-01 (legacy)| 16K      | $0.14/1M tokens     | $0.97/1M tokens     |
	| abab6.5s-chat (legacy)  | 8K       | $0.014/1M tokens    | $0.014/1M tokens    |
	| abab6.5g-chat (legacy)  | 8K       | $0.07/1M tokens     | $0.07/1M tokens     |
	| abab6.5t-chat (legacy)  | 8K       | $0.07/1M tokens     | $0.07/1M tokens     |
	`
}

func (p *MiniMaxModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	price := 0.0
	priceTable := map[string][2]float64{
		"minimax-m2.7":           {0.0003, 0.0012},
		"minimax-m2.5-lightning": {0.0003, 0.0024},
		"minimax-m2.5-standard":  {0.00015, 0.0012},
		"minimax-m2.1":           {0.0003, 0.0012},
		"MiniMax-Text-01":        {0.00014, 0.00097},
		"abab6.5s-chat":          {0.000014, 0.000014},
		"abab6.5g-chat":          {0.00007, 0.00007},
		"abab6.5t-chat":          {0.00007, 0.00007},
	}

	if priceItem, ok := priceTable[p.subType]; ok {
		inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
		outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
		price = inputPrice + outputPrice
	} else {
		return fmt.Errorf(i18n.Translate(lang, "embedding:calculatePrice() error: unknown model type: %s"), p.subType)
	}

	modelResult.TotalPrice = price
	modelResult.Currency = "USD"
	return nil
}

func (p *MiniMaxModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	const BaseUrl = "https://api.minimax.chat/v1"

	localProvider, err := NewLocalModelProvider("Custom", "", p.apiKey, p.temperature, 0, 0, 0, BaseUrl, p.subType, 0, 0, "USD")
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
