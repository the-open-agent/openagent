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
	"fmt"
	"io"
	"net/http"

	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/proxy"
)

const (
	kimiCodingBaseURL   = "https://api.kimi.com/coding/v1"
	kimiCodingUserAgent = "KimiCLI/1.44.0"
)

// kimiCodingTransport wraps an underlying RoundTripper and overrides the
// User-Agent header to "KimiCLI/1.44.0". The Kimi coding API requires this
// UA string; without it the endpoint rejects non-code-related requests.
type kimiCodingTransport struct {
	base http.RoundTripper
}

func (t *kimiCodingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.Header.Set("User-Agent", kimiCodingUserAgent)
	return t.base.RoundTrip(req)
}

type MoonshotModelProvider struct {
	temperature float32
	subType     string
	secretKey   string
	topP        float32
}

func NewMoonshotModelProvider(subType string, secretKey string, temperature float32, topP float32) (*MoonshotModelProvider, error) {
	client := &MoonshotModelProvider{
		subType:     subType,
		secretKey:   secretKey,
		temperature: temperature,
		topP:        topP,
	}
	return client, nil
}

func getKimiCodingClientFromToken(authToken string) *openai.Client {
	config := openai.DefaultConfig(authToken)
	config.BaseURL = kimiCodingBaseURL

	baseTransport := proxy.ProxyHttpClient.Transport
	if baseTransport == nil {
		baseTransport = http.DefaultTransport
	}

	transport := &kimiCodingTransport{base: baseTransport}
	httpClient := &http.Client{Transport: transport}
	config.HTTPClient = httpClient

	c := openai.NewClientWithConfig(config)
	return c
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
| kimi-for-coding        | 1M tokens      | Auto (Tier) | Auto (Tier)  |
`
}

func (p *MoonshotModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
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

	if p.subType == "kimi-latest" || p.subType == "kimi-for-coding" {
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
		return fmt.Errorf(i18n.Translate(lang, "embedding:calculatePrice() error: unknown model type: %s"), p.subType)
	}

	modelResult.TotalPrice = price
	modelResult.Currency = "CNY"
	return nil
}

func (p *MoonshotModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	var localProvider *LocalModelProvider
	var err error

	if p.subType == "kimi-for-coding" {
		localProvider, err = NewLocalModelProvider("Custom-think", "custom-model", p.secretKey, p.temperature, p.topP, 0, 0, kimiCodingBaseURL, p.subType, 0, 0, "CNY")
		if err != nil {
			return nil, err
		}
		localProvider.customClient = getKimiCodingClientFromToken(p.secretKey)
	} else {
		const BaseUrl = "https://api.moonshot.cn/v1"
		localProvider, err = NewLocalModelProvider("Custom-think", "custom-model", p.secretKey, p.temperature, p.topP, 0, 0, BaseUrl, p.subType, 0, 0, "CNY")
		if err != nil {
			return nil, err
		}
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
