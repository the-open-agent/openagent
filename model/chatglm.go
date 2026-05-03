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
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/leverly/ChatGLM/client"
	"github.com/the-open-agent/openagent/i18n"
)

type ChatGLMModelProvider struct {
	subType      string
	clientSecret string
}

func NewChatGLMModelProvider(subType string, clientSecret string) (*ChatGLMModelProvider, error) {
	return &ChatGLMModelProvider{subType: subType, clientSecret: clientSecret}, nil
}

func (c *ChatGLMModelProvider) GetPricing() string {
	return `URL:
	https://open.bigmodel.cn/pricing

	| Model         | Context  | Input Price          | Output Price         |
	|---------------|----------|----------------------|----------------------|
	| glm-5.1       | 200K     | 0.006 yuan/K tokens  | 0.024 yuan/K tokens  |
	| glm-5         | 200K     | 0.004 yuan/K tokens  | 0.018 yuan/K tokens  |
	| glm-5-turbo   | 200K     | 0.005 yuan/K tokens  | 0.022 yuan/K tokens  |
	| glm-4         | 128K     | 0.100 yuan/K tokens  | 0.100 yuan/K tokens  |
	| glm-4V        | 2K       | 0.100 yuan/K tokens  | 0.100 yuan/K tokens  |
	| glm-3-turbo   | 128K     | 0.005 yuan/K tokens  | 0.005 yuan/K tokens  |
	`
}

func (p *ChatGLMModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	price := 0.0
	priceTable := map[string][2]float64{
		"glm-5.1":     {0.006, 0.024},
		"glm-5":       {0.004, 0.018},
		"glm-5-turbo": {0.005, 0.022},
		"glm-4":       {0.010, 0.010},
		"glm-4v":      {0.010, 0.010},
		"glm-3-turbo": {0.005, 0.005},
	}

	if priceItem, ok := priceTable[p.subType]; ok {
		inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
		outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
		price = inputPrice + outputPrice
	} else {
		return fmt.Errorf(i18n.Translate(lang, "embedding:calculatePrice() error: unknown model type: %s"), p.subType)
	}

	modelResult.TotalPrice = price
	modelResult.Currency = "CNY"
	return nil
}

func (p *ChatGLMModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	proxy := client.NewChatGLMClient(p.clientSecret, 30*time.Second)
	messages := []client.Message{{Role: "user", Content: question}}
	taskId, err := proxy.AsyncInvoke(p.subType, 0.2, messages)
	if err != nil {
		return nil, err
	}

	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	flushData := func(data string) error {
		if _, err = fmt.Fprintf(writer, "event: message\ndata: %s\n\n", data); err != nil {
			return err
		}
		flusher.Flush()
		return nil
	}

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

	response, err := proxy.AsyncInvokeTask(p.subType, taskId)
	if err != nil {
		return nil, err
	}

	content := (*response.Choices)[0].Content

	err = flushData(content)
	if err != nil {
		return nil, err
	}

	modelResult := &ModelResult{}
	modelResult.PromptTokenCount = response.Usage.PromptTokens
	modelResult.ResponseTokenCount = response.Usage.CompletionTokens
	modelResult.TotalTokenCount = response.Usage.TotalTokens

	err = p.calculatePrice(modelResult, lang)
	if err != nil {
		return nil, err
	}

	return modelResult, nil
}
