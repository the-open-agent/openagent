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

package embedding

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"

)

type MiniMaxEmbeddingProvider struct {
	subType     string
	apiKey      string
	providerUrl string // providerUrl contains groupId
}

func NewMiniMaxEmbeddingProvider(typ string, subType string, apiKey string, providerUrl string) (*MiniMaxEmbeddingProvider, error) {
	p := &MiniMaxEmbeddingProvider{
		subType:     subType,
		apiKey:      apiKey,
		providerUrl: providerUrl,
	}
	return p, nil
}

func (p *MiniMaxEmbeddingProvider) GetPricing() string {
	return `URL:
https://platform.minimaxi.com/document/Price

Embedding models:

| Models    | Per 1,000,000 tokens |
|-----------|----------------------|
| embo-01 	| ¥0.0005              |
`
}

func (p *MiniMaxEmbeddingProvider) calculatePrice(res *EmbeddingResult) error {
	pricePerThousandTokens := 0.0005
	res.Price = getPrice(res.TokenCount, pricePerThousandTokens)
	res.Currency = "CNY"
	return nil
}

type EmbeddingRequest struct {
	Texts []string `json:"texts"`
	Model string   `json:"model"`
	Type  string   `json:"type"`
}
type base_resp struct {
	status_code int64
	status_msg  string
}
type EmbeddingResponse struct {
	Vectors      [][]float32 `json:"vectors"`
	Total_tokens int64       `json:"total_tokens"`
	Base_resp    base_resp   `json:"base_resp"`
}

func (p *MiniMaxEmbeddingProvider) QueryVector(text string, ctx context.Context, lang string) ([]float32, *EmbeddingResult, error) {
	url := p.providerUrl
	apiKey := p.apiKey

	requestData := EmbeddingRequest{
		Texts: []string{text},
		Model: p.subType,
		Type:  "db",
	}

	requestBody, err := json.Marshal(requestData)
	if err != nil {
		return nil, nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, nil, newI18nError(lang, "embedding:request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	var embeddingResponse EmbeddingResponse
	err = json.Unmarshal(body, &embeddingResponse)
	if err != nil {
		return nil, nil, newI18nError(lang, "embedding:error unmarshaling response JSON: %v", err)
	}

	if len(embeddingResponse.Vectors) == 0 {
		return nil, nil, newI18nError(lang, "embedding:no embedding vector found in response")
	}

	embeddingResult := &EmbeddingResult{
		TokenCount: int(embeddingResponse.Total_tokens),
	}

	err = p.calculatePrice(embeddingResult)
	if err != nil {
		return nil, nil, err
	}

	return embeddingResponse.Vectors[0], embeddingResult, nil
}
