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
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/the-open-agent/openagent/i18n"
)

type AmazonBedrockModelProvider struct {
	temperature                  float64
	subType                      string
	secretKey                    string
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewAmazonBedrockModelProvider(subType string, secretKey string, temperature float64, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*AmazonBedrockModelProvider, error) {
	client := &AmazonBedrockModelProvider{
		subType:                      subType,
		secretKey:                    secretKey,
		temperature:                  temperature,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}
	return client, nil
}

func (a AmazonBedrockModelProvider) GetPricing() string {
	return `URL: https://aws.amazon.com/cn/bedrock/pricing/

Model 
| Model                       | Unit Of Charge                | Price    |
|-----------------------------|-------------------------------|----------|
| Claude                      | 1K input tokens               | $0.008   |
| Claude                      | 1K output tokens              | $0.024   |
| Claude Instant              | 1K input tokens               | $0.0008  |
| Claude Instant              | 1K output tokens              | $0.0024  |
| Command                     | 1K input tokens               | $0.0015  |
| Command                     | 1K output tokens              | $0.002   |
| Command Light               | 1K input tokens               | $0.0003  |
| Command Light               | 1K output tokens              | $0.0006  |
| Embed - English             | 1K input tokens               | $0.0001  |
| Embed - Multilingual        | 1K input tokens               | $0.0001  |
| Jurassic-2 Mid              | 1K input tokens               | $0.0125  |
| Jurassic-2 Mid              | 1K output tokens              | $0.0125  |
| Jurassic-2 Ultra            | 1K input tokens               | $0.0188  |
| Jurassic-2 Ultra            | 1K output tokens              | $0.0188  |
| Llama 2 Chat (13B)          | 1K input tokens               | $0.00075 |
| Llama 2 Chat (13B)          | 1K output tokens              | $0.001   |
| Llama 2 Chat (70B)          | 1K input tokens               | $0.00195 |
| Llama 2 Chat (70B)          | 1K output tokens              | $0.00256 |
| Titan Text Lite             | 1K input tokens               | $0.0003  |
| Titan Text Lite             | 1K output tokens              | $0.0004  |
| Titan Text Express          | 1K input tokens               | $0.0008  |
| Titan Text Express          | 1K output tokens              | $0.0016  |
| Titan Embeddings            | 1K input tokens               | $0.0001  |
| Titan Multimodal Embeddings | 1K input tokens               | $0.0008  |
| Titan Multimodal Embeddings | 1 input image                 | $0.00006 |

`
}

func (p *AmazonBedrockModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	if applyConfiguredPerThousandTokenPrices(p.inputPricePerThousandTokens, p.outputPricePerThousandTokens, pickCurrency(p.currency, "USD"), modelResult) {
		return nil
	}

	prices := map[string]struct {
		InputTokenPrice  float64
		OutputTokenPrice float64
	}{
		"Claude":                      {0.008, 0.024},
		"Claude Instant":              {0.0008, 0.0024},
		"Command":                     {0.0015, 0.002},
		"Command Light":               {0.0003, 0.0006},
		"Embed - English":             {0.0001, 0},
		"Embed - Multilingual":        {0.0001, 0},
		"Jurassic-2 Mid":              {0.0125, 0.0125},
		"Jurassic-2 Ultra":            {0.0188, 0.0188},
		"Llama 2 Chat (13B)":          {0.00075, 0.001},
		"Llama 2 Chat (70B)":          {0.00195, 0.00256},
		"Titan Text Lite":             {0.0003, 0.0004},
		"Titan Text Express":          {0.0008, 0.0016},
		"Titan Embeddings":            {0.0001, 0},
		"Titan Multimodal Embeddings": {0.0008, 0},
	}
	price, ok := prices[p.subType]
	if !ok {
		if strings.Contains(strings.ToLower(p.subType), "claude-opus-4-7") || strings.Contains(strings.ToLower(p.subType), "claude-opus-4-6") || strings.Contains(strings.ToLower(p.subType), "claude-opus-4-5") {
			price = struct {
				InputTokenPrice  float64
				OutputTokenPrice float64
			}{InputTokenPrice: 0.005, OutputTokenPrice: 0.025}
			ok = true
		} else if strings.Contains(strings.ToLower(p.subType), "claude-sonnet-4-6") || strings.Contains(strings.ToLower(p.subType), "claude-sonnet-4") {
			price = struct {
				InputTokenPrice  float64
				OutputTokenPrice float64
			}{InputTokenPrice: 0.003, OutputTokenPrice: 0.015}
			ok = true
		}
	}
	if !ok {
		lower := strings.ToLower(p.subType)
		mid := lower
		if i := strings.Index(mid, "anthropic."); i >= 0 {
			mid = mid[i+len("anthropic."):]
		}
		if j := strings.Index(mid, ":"); j >= 0 {
			mid = mid[:j]
		}
		mid = strings.ReplaceAll(mid, "_", "-")
		if inK, outK, hit := ResolveClaudeUSDPerThousand(mid); hit {
			inputTokenPrice := float64(modelResult.PromptTokenCount) / 1000.0 * inK
			outputTokenPrice := float64(modelResult.ResponseTokenCount) / 1000.0 * outK
			modelResult.TotalPrice = inputTokenPrice + outputTokenPrice
			modelResult.Currency = "USD"
			return nil
		}
		if strings.Contains(lower, "llama") || strings.Contains(lower, "meta.llama") {
			if strings.Contains(lower, "70b") || strings.Contains(lower, "405") {
				price = struct {
					InputTokenPrice  float64
					OutputTokenPrice float64
				}{InputTokenPrice: 0.00195, OutputTokenPrice: 0.00256}
			} else {
				price = struct {
					InputTokenPrice  float64
					OutputTokenPrice float64
				}{InputTokenPrice: 0.00075, OutputTokenPrice: 0.001}
			}
			ok = true
		}
	}
	if !ok {
		modelResult.TotalPrice = 0
		modelResult.Currency = "USD"
		return nil
	}
	inputTokenPrice := float64(modelResult.PromptTokenCount) / 1000.0 * price.InputTokenPrice
	outputTokenPrice := float64(modelResult.ResponseTokenCount) / 1000.0 * price.OutputTokenPrice
	modelResult.TotalPrice = inputTokenPrice + outputTokenPrice
	modelResult.Currency = "USD"
	return nil
}

func (p *AmazonBedrockModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("us-west-2"))
	if err != nil {
		return nil, err
	}
	client := bedrockruntime.NewFromConfig(cfg)

	maxTokens := getContextLength(p.subType)

	requestBody, err := json.Marshal(map[string]interface{}{
		"prompt":      prompt + question,
		"temperature": p.temperature,
		"max_tokens":  maxTokens,
	})
	if err != nil {
		return nil, err
	}

	if strings.HasPrefix(question, "$OpenAgentDryRun$") {
		modelResult, err := getDefaultModelResult(p.subType, question, "")
		if err != nil {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:cannot calculate tokens"))
		}
		if maxTokens > modelResult.TotalTokenCount {
			return modelResult, nil
		} else {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:exceed max tokens"))
		}
	}

	resp, err := client.InvokeModel(context.TODO(), &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(p.subType),
		Body:        requestBody,
		ContentType: aws.String("application/json"),
	})
	if err != nil {
		return nil, err
	}

	var result struct {
		Generation string `json:"generation"`
	}
	if err := json.Unmarshal(resp.Body, &result); err != nil {
		return nil, err
	}

	_, err = writer.Write([]byte(result.Generation))
	if err != nil {
		return nil, err
	}

	modelResult, err := getDefaultModelResult(p.subType, question, result.Generation)
	if err != nil {
		return nil, err
	}

	if err := p.calculatePrice(modelResult, lang); err != nil {
		return nil, err
	}

	return modelResult, nil
}
