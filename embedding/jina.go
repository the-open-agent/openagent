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

package embedding

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
)

type JinaEmbeddingProvider struct {
	subType string
	apiKey  string
}

func NewJinaEmbeddingProvider(subType string, apiKey string) (*JinaEmbeddingProvider, error) {
	p := &JinaEmbeddingProvider{
		subType: subType,
		apiKey:  apiKey,
	}
	return p, nil
}

func (p *JinaEmbeddingProvider) GetPricing() string {
	return `URL:
https://jina.ai/zh-CN/embeddings/

Embedding models:

| Models            | Per 1,000,000 tokens |
|-------------------|----------------------|
| jina-embeddings	| $0.02                |
`
}

func (p *JinaEmbeddingProvider) calculatePrice(res *EmbeddingResult) error {
	pricePerThousandTokens := 0.00002
	res.Price = getPrice(res.TokenCount, pricePerThousandTokens)
	res.Currency = "USD"
	return nil
}

func (p *JinaEmbeddingProvider) QueryVector(text string, ctx context.Context, lang string) ([]float32, *EmbeddingResult, error) {
	if text == "" {
		return nil, nil, newI18nError(lang, "embedding:text cannot be empty")
	}

	url := "https://api.jina.ai/v1/embeddings"
	token := p.apiKey
	model := p.subType

	if text == "" {
		return nil, nil, newI18nError(lang, "embedding:text can not be empty.")
	}

	payload := map[string]interface{}{
		"model":          model,
		"normalized":     true,
		"embedding_type": "float",
		"input":          []string{text},
	}

	reqBody, err := json.Marshal(payload)
	if err != nil {
		return nil, nil, newI18nError(lang, "embedding:failed to marshal payload: %v", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, nil, newI18nError(lang, "embedding:failed to create request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, newI18nError(lang, "embedding:failed to get valid response, status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, newI18nError(lang, "embedding:failed to read response body: %v", err)
	}

	var apiResponse struct {
		Model string `json:"model"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
		Data []struct {
			Object    string    `json:"object"`
			Index     int       `json:"index"`
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		return nil, nil, newI18nError(lang, "embedding:failed to unmarshal response: %v", err)
	}

	if len(apiResponse.Data) == 0 {
		return nil, nil, newI18nError(lang, "embedding:no embeddings found in the response")
	}
	embedding := apiResponse.Data[0].Embedding

	embeddingResult := &EmbeddingResult{
		TokenCount: apiResponse.Usage.TotalTokens,
	}

	err = p.calculatePrice(embeddingResult)
	if err != nil {
		return nil, nil, newI18nError(lang, "embedding:failed to calculate price: %v", err)
	}

	return embedding, embeddingResult, nil
}
