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
)

type LiteLLMModelProvider struct {
	subType                      string
	secretKey                    string
	temperature                  float32
	topP                         float32
	frequencyPenalty             float32
	presencePenalty              float32
	providerUrl                  string
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewLiteLLMModelProvider(subType string, secretKey string, temperature float32, topP float32, frequencyPenalty float32, presencePenalty float32, providerUrl string, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*LiteLLMModelProvider, error) {
	return &LiteLLMModelProvider{
		subType:                      subType,
		secretKey:                    secretKey,
		temperature:                  temperature,
		topP:                         topP,
		frequencyPenalty:             frequencyPenalty,
		presencePenalty:              presencePenalty,
		providerUrl:                  providerUrl,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}, nil
}

func (p *LiteLLMModelProvider) GetPricing() string {
	return `URL:
https://docs.litellm.ai/docs/

LiteLLM is an AI gateway that provides a unified OpenAI-compatible
interface to 100+ LLM providers (OpenAI, Anthropic, Gemini, Bedrock,
Vertex AI, Groq, Ollama, Mistral, Cohere, and more).

Pricing depends on the upstream model routed through the LiteLLM proxy.
Configure per-model pricing in your LiteLLM proxy config or set custom
input/output prices in the provider settings.
`
}

func (p *LiteLLMModelProvider) calculatePrice(modelResult *ModelResult) {
	if p.inputPricePerThousandTokens > 0 || p.outputPricePerThousandTokens > 0 {
		inputPrice := getPrice(modelResult.PromptTokenCount, p.inputPricePerThousandTokens)
		outputPrice := getPrice(modelResult.ResponseTokenCount, p.outputPricePerThousandTokens)
		modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
		modelResult.Currency = p.currency
	} else {
		modelResult.TotalPrice = 0
		modelResult.Currency = "USD"
	}
}

func (p *LiteLLMModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	localProvider, err := NewLocalModelProvider("Custom-think", "custom-model", p.secretKey, p.temperature, p.topP, p.frequencyPenalty, p.presencePenalty, p.providerUrl, p.subType, p.inputPricePerThousandTokens, p.outputPricePerThousandTokens, p.currency)
	if err != nil {
		return nil, err
	}

	modelResult, err := localProvider.QueryText(question, writer, history, prompt, knowledgeMessages, toolSession, lang)
	if err != nil {
		return nil, err
	}

	p.calculatePrice(modelResult)
	return modelResult, nil
}

func (p *LiteLLMModelProvider) ListModels() ([]string, error) {
	return openaiCompatibleListModels("litellm", p.secretKey, p.providerUrl)
}
