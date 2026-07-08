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

package embedding

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"strings"

	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/i18n"
)

type LocalEmbeddingProvider struct {
	typ                    string
	subType                string
	deploymentName         string
	secretKey              string
	providerUrl            string
	compatibleProvider     string
	apiVersion             string
	pricePerThousandTokens float64
	currency               string
}

// normalizeOllamaBaseURL ensures the URL ends with exactly "/v1",
// regardless of whether the user typed trailing slashes or included "/v1".
func normalizeOllamaBaseURL(rawURL string) string {
	u := strings.TrimRight(rawURL, "/")
	if u == "" {
		return ""
	}
	if !strings.HasSuffix(u, "/v1") {
		u += "/v1"
	}
	return u
}

func NewLocalEmbeddingProvider(typ string, subType string, secretKey string, providerUrl string, compatibleProvider string, pricePerThousandTokens float64, currency string) (*LocalEmbeddingProvider, error) {
	p := &LocalEmbeddingProvider{
		typ:                    typ,
		subType:                subType,
		secretKey:              secretKey,
		providerUrl:            providerUrl,
		pricePerThousandTokens: pricePerThousandTokens,
		currency:               currency,
		compatibleProvider:     compatibleProvider,
	}
	return p, nil
}

func getLocalClientFromUrl(authToken string, url string) *openai.Client {
	config := openai.DefaultConfig(authToken)
	config.BaseURL = url

	transport := &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	httpClient := http.Client{Transport: transport}
	config.HTTPClient = &httpClient

	c := openai.NewClientWithConfig(config)
	return c
}

func (p *LocalEmbeddingProvider) GetPricing() string {
	return `URL:
https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/

Embedding models:

| Models                   | Per 1,000 tokens |
|--------------------------|------------------|
| Ada                      | $0.0001          |
| text-embedding-3-large   | $0.00013         |
| text-embedding-3-small   | $0.00002         |
`
}

func (p *LocalEmbeddingProvider) calculatePrice(res *EmbeddingResult, lang string) error {
	embeddingModel := p.subType
	var pricePerThousandTokens float64
	res.Currency = "USD"
	switch {
	case strings.Contains(embeddingModel, "text-embedding-ada-002"):
		pricePerThousandTokens = 0.0001
	case strings.Contains(embeddingModel, "text-embedding-3-small"):
		pricePerThousandTokens = 0.00002
	case strings.Contains(embeddingModel, "text-embedding-3-large"):
		pricePerThousandTokens = 0.00013
	case embeddingModel == "custom-embedding" || p.typ == "Ollama":
		pricePerThousandTokens = p.pricePerThousandTokens
		res.Currency = p.currency
	default:
		if p.typ == "Local" {
			pricePerThousandTokens = p.pricePerThousandTokens
			res.Currency = p.currency
		} else {
			return fmt.Errorf(i18n.Translate(lang, "embedding:calculatePrice() error: unknown model type: %s"), embeddingModel)
		}
	}

	res.Price = getPrice(res.TokenCount, pricePerThousandTokens)
	return nil
}

func (p *LocalEmbeddingProvider) QueryVector(text string, ctx context.Context, lang string) ([]float32, *EmbeddingResult, error) {
	var client *openai.Client
	if p.typ == "Local" {
		client = getLocalClientFromUrl(p.secretKey, p.providerUrl)
	} else if p.typ == "Azure" {
		client = getAzureClientFromToken(p.deploymentName, p.secretKey, p.providerUrl, p.apiVersion)
	} else if p.typ == "OpenAI" {
		client = getProxyClientFromToken(p.secretKey)
	} else if p.typ == "Custom" {
		client = getLocalClientFromUrl(p.secretKey, p.providerUrl)
	}
	model := p.subType
	if model == "custom-embedding" && p.compatibleProvider != "" {
		model = p.compatibleProvider
	} else if model == "custom-embedding" && p.compatibleProvider == "" {
		return nil, nil, newI18nError(lang, "embedding:no embedding provider specified")
	}

	resp, err := client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
		Input: []string{text},
		Model: openai.EmbeddingModel(model),
	})
	if err != nil {
		return nil, nil, err
	}

	tokenCount := resp.Usage.PromptTokens
	embeddingResult := &EmbeddingResult{TokenCount: tokenCount}

	if p.typ != "Custom" {
		err = p.calculatePrice(embeddingResult, lang)
		if err != nil {
			return nil, nil, err
		}
	}

	vector := resp.Data[0].Embedding
	return vector, embeddingResult, nil
}
