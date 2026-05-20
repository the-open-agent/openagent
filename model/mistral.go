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
	"strings"

	"github.com/gage-technologies/mistral-go"
	"github.com/the-open-agent/openagent/i18n"
)

type MistralModelProvider struct {
	client                       *mistral.MistralClient
	modelName                    string
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewMistralProvider(apiKey, modelName string, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*MistralModelProvider, error) {
	client := mistral.NewMistralClientDefault(apiKey)

	return &MistralModelProvider{
		client:                       client,
		modelName:                    modelName,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}, nil
}

func (c *MistralModelProvider) GetPricing() string {
	return `URL: https://mistral.ai/technology/#pricing

	| Model                               | Input Price($) per 1K tokens  | Output Price($) per 1K tokens  |
	|-------------------------------------|-------------------------------|--------------------------------|
	| mistral-large-latest                | 0.002                         | 0.006                          |
	| pixtral-large-latest                | 0.002                         | 0.006                          |
	| mistral-small-latest                | 0.0002                        | 0.0006                         |
	| codestral-latest                    | 0.0003                        | 0.0009                         |
	| ministral-8b-latest                 | 0.0001                        | 0.0001                         |
	| ministral-3b-latest                 | 0.00004                       | 0.00004                        |
	| pixtral-12b                         | 0.00015                       | 0.00015                        |
	| mistral-nemo                        | 0.00015                       | 0.00015                        |
	| open-mistral-7b                     | 0.00025                       | 0.00025                        |
	| open-mixtral-8x7b                   | 0.0007                        | 0.0007                         |
	| open-mixtral-8x22b                  | 0.002                         | 0.006                          |
	`
}

func (c *MistralModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	if applyConfiguredPerThousandTokenPrices(c.inputPricePerThousandTokens, c.outputPricePerThousandTokens, pickCurrency(c.currency, "USD"), modelResult) {
		return nil
	}

	priceTable := map[string][2]float64{
		"mistral-large-latest": {0.002, 0.006},
		"pixtral-large-latest": {0.002, 0.006},
		"mistral-small-latest": {0.0002, 0.0006},
		"codestral-latest":     {0.0003, 0.0009},
		"ministral-8b-latest":  {0.0001, 0.0001},
		"ministral-3b-latest":  {0.00004, 0.0001},
		"pixtral-12b":          {0.00015, 0.00015},
		"mistral-nemo":         {0.00015, 0.00015},
		"open-mistral-7b":      {0.00025, 0.00025},
		"open-mixtral-8x7b":    {0.0007, 0.0007},
		"open-mixtral-8x22b":   {0.002, 0.006},
	}

	modelName := strings.TrimSpace(c.modelName)
	var priceItem [2]float64
	var ok bool
	if priceItem, ok = priceTable[modelName]; ok {
		// exact id
	} else {
		lower := strings.ToLower(modelName)
		switch {
		case strings.Contains(lower, "large") || strings.Contains(lower, "pixtral-large"):
			priceItem = [2]float64{0.002, 0.006}
			ok = true
		case strings.Contains(lower, "small"):
			priceItem = [2]float64{0.0002, 0.0006}
			ok = true
		case strings.Contains(lower, "codestral"):
			priceItem = [2]float64{0.0003, 0.0009}
			ok = true
		case strings.Contains(lower, "ministral"):
			priceItem = [2]float64{0.0001, 0.0001}
			ok = true
		case strings.Contains(lower, "8x22") || strings.Contains(lower, "mixtral-8x22"):
			priceItem = [2]float64{0.002, 0.006}
			ok = true
		case strings.Contains(lower, "8x7") || strings.Contains(lower, "mixtral-8x7"):
			priceItem = [2]float64{0.0007, 0.0007}
			ok = true
		case strings.Contains(lower, "nemo"):
			priceItem = [2]float64{0.00015, 0.00015}
			ok = true
		case strings.Contains(lower, "mistral") || strings.Contains(lower, "pixtral"):
			priceItem = [2]float64{0.002, 0.006}
			ok = true
		}
	}

	if ok {
		inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
		outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
		modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
	} else {
		modelResult.TotalPrice = 0
	}

	modelResult.Currency = "USD"
	return nil
}

func (c *MistralModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	chatRes, err := c.client.Chat(c.modelName, []mistral.ChatMessage{{Content: question, Role: mistral.RoleUser}}, nil)
	if err != nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:error getting chat completion: %v"), err)
	}

	respText := chatRes.Choices[0].Message.Content
	respText = strings.TrimSpace(respText)

	_, err = fmt.Fprint(writer, respText)
	if err != nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:failed to write response: %v"), err)
	}

	modelResult, err := getDefaultModelResult(c.modelName, question, respText)
	if err != nil {
		return nil, err
	}

	err = c.calculatePrice(modelResult, lang)
	if err != nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "embedding:failed to calculate price: %v"), err)
	}
	modelResult.PromptTokenCount += len(question)

	return modelResult, nil
}
