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
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/the-open-agent/openagent/proxy"
)

// DryRunPrefix is a special prefix that triggers model providers to estimate
// token count and price without actually calling the AI model APIs.
const DryRunPrefix = "$OpenAgentDryRun$"

type ModelResult struct {
	PromptTokenCount   int
	ResponseTokenCount int
	TotalTokenCount    int
	ImageCount         int
	TotalPrice         float64
	Currency           string
}

func newModelResult(promptTokenCount int, responseTokenCount int, totalTokenCount int) *ModelResult {
	return &ModelResult{
		PromptTokenCount:   promptTokenCount,
		ResponseTokenCount: responseTokenCount,
		TotalTokenCount:    totalTokenCount,
	}
}

type ModelProvider interface {
	GetPricing() string
	QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error)
	ListModels() ([]string, error)
}

func newListModelsHTTPClient() *http.Client {
	if proxy.ProxyHttpClient != nil {
		clonedClient := *proxy.ProxyHttpClient
		clonedClient.Timeout = 30 * time.Second
		return &clonedClient
	}

	return &http.Client{
		Timeout: 30 * time.Second,
	}
}

func unsupportedListModels(providerType string) ([]string, error) {
	return []string{}, fmt.Errorf("%s: ListModels() is not implemented", providerType)
}

func openaiCompatibleListModels(providerType string, secretKey string, url string) ([]string, error) {
	if url == "" {
		return []string{}, fmt.Errorf("%s: ListModels() error: provider URL is empty", providerType)
	}

	if !strings.HasSuffix(url, "/") {
		url += "/"
	}
	url += "models"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return []string{}, err
	}

	if secretKey != "" {
		req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(secretKey))
	}

	resp, err := newListModelsHTTPClient().Do(req)
	if err != nil {
		return []string{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []string{}, fmt.Errorf("%s: ListModels() error: status code %d", providerType, resp.StatusCode)
	}

	var result struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return []string{}, err
	}

	var models []string
	for _, m := range result.Data {
		models = append(models, m.ID)
	}
	return models, nil
}

func GetModelProvider(typ string, subType string, clientId string, clientSecret string, userKey string, temperature float32, topP float32, topK int, frequencyPenalty float32, presencePenalty float32, providerUrl string, apiVersion string, compatibleProvider string, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, Currency string, enableThinking bool) (ModelProvider, error) {
	var p ModelProvider
	var err error
	if typ == "Ollama" {
		p, err = NewLocalModelProvider("Custom-think", "custom-model", "randomString", temperature, topP, 0, 0, providerUrl, subType, inputPricePerThousandTokens, outputPricePerThousandTokens, Currency)
	} else if typ == "Local" {
		p, err = NewLocalModelProvider(typ, subType, clientSecret, temperature, topP, frequencyPenalty, presencePenalty, providerUrl, compatibleProvider, inputPricePerThousandTokens, outputPricePerThousandTokens, Currency)
	} else if typ == "OpenAI" {
		p, err = NewOpenAiModelProvider(subType, clientSecret, "", temperature, topP, frequencyPenalty, presencePenalty, 0, 0, "")
	} else if typ == "OpenAI Compatible" {
		p, err = NewLocalModelProvider("Custom-think", "custom-model", clientSecret, temperature, topP, frequencyPenalty, presencePenalty, providerUrl, subType, inputPricePerThousandTokens, outputPricePerThousandTokens, Currency)
	} else if typ == "Gemini" {
		p, err = NewGeminiModelProvider(subType, clientSecret, temperature, topP, topK)
	} else if typ == "Azure" {
		p, err = NewAzureModelProvider(typ, subType, clientId, clientSecret, temperature, topP, frequencyPenalty, presencePenalty, providerUrl, apiVersion)
	} else if typ == "Hugging Face" {
		p, err = NewHuggingFaceModelProvider(subType, clientSecret, temperature)
	} else if typ == "Claude" {
		p, err = NewClaudeModelProvider(subType, clientSecret, enableThinking, topK)
	} else if typ == "Grok" {
		p, err = NewGrokModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "OpenRouter" {
		p, err = NewOpenRouterModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "Baidu Cloud" {
		p, err = NewBaiduCloudModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "iFlytek" {
		p, err = NewiFlytekModelProvider(subType, clientSecret, temperature)
	} else if typ == "ChatGLM" {
		p, err = NewChatGLMModelProvider(subType, clientSecret)
	} else if typ == "MiniMax" {
		p, err = NewMiniMaxModelProvider(subType, clientId, clientSecret, temperature)
	} else if typ == "Cohere" {
		p, err = NewCohereModelProvider(subType, clientSecret)
	} else if typ == "Moonshot" {
		p, err = NewMoonshotModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "Amazon Bedrock" {
		p, err = NewAmazonBedrockModelProvider(subType, clientSecret, float64(temperature))
	} else if typ == "Alibaba Cloud" {
		p, err = NewAlibabacloudModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "Baichuan" {
		p, err = NewBaichuanModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "Volcano Engine" {
		p, err = NewVolcengineModelProvider(subType, providerUrl, clientSecret, temperature, topP, enableThinking)
	} else if typ == "DeepSeek" {
		p, err = NewDeepSeekProvider(subType, clientSecret, temperature, topP)
	} else if typ == "StepFun" {
		p, err = NewStepFunModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "Tencent Cloud" {
		p, err = NewTencentCloudProvider(clientSecret, providerUrl, subType, temperature, topP)
	} else if typ == "Mistral" {
		p, err = NewMistralProvider(clientSecret, subType)
	} else if typ == "Yi" {
		p, err = NewYiProvider(subType, clientSecret, temperature, topP)
	} else if typ == "Silicon Flow" {
		p, err = NewSiliconFlowProvider(subType, clientSecret, temperature, topP)
	} else if typ == "GitHub" {
		p, err = NewGitHubModelProvider(typ, subType, clientSecret, temperature, topP, frequencyPenalty, presencePenalty)
	} else if typ == "Writer" {
		p, err = NewWriterModelProvider(subType, clientSecret, temperature, topP)
	} else if typ == "OpenCode" {
		p, err = NewOpenCodeProvider(providerUrl, clientSecret)
	} else {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}
