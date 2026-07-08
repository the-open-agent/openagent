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
	"context"

	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common"
	"github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/common/profile"
	hunyuan "github.com/tencentcloud/tencentcloud-sdk-go/tencentcloud/hunyuan/v20230901"
)

type TencentCloudEmbeddingProvider struct {
	client *hunyuan.Client
}

func NewTencentCloudEmbeddingProvider(clientId, clientSecret string, lang string) (*TencentCloudEmbeddingProvider, error) {
	credential := common.NewCredential(clientId, clientSecret)
	region := "ap-guangzhou"
	cpf := profile.NewClientProfile()
	client, err := hunyuan.NewClient(credential, region, cpf)
	if err != nil {
		return nil, newI18nError(lang, "embedding:failed to create client: %v", err)
	}
	return &TencentCloudEmbeddingProvider{
		client: client,
	}, nil
}

func (p *TencentCloudEmbeddingProvider) GetPricing() string {
	return `URL:
https://cloud.tencent.com/document/product/1729/97731

Embedding models:

| Models    | Price per 1,000 tokens |
|-----------|------------------------|
| Embedding | ¥0.0007/thousand tokens|
`
}

func (p *TencentCloudEmbeddingProvider) calculatePrice(res *EmbeddingResult) error {
	// Example placeholder logic for price calculation, real logic may vary.
	pricePerThousandTokens := 0.0007 // Hypothetical price in CNY
	res.Price = getPrice(res.TokenCount, pricePerThousandTokens)
	res.Currency = "CNY"
	return nil
}

func (p *TencentCloudEmbeddingProvider) QueryVector(text string, ctx context.Context, lang string) ([]float32, *EmbeddingResult, error) {
	request := hunyuan.NewGetEmbeddingRequest()
	request.Input = common.StringPtr(text)

	response, err := p.client.GetEmbedding(request)
	if err != nil {
		return nil, nil, err
	}

	if len(response.Response.Data) == 0 {
		return nil, nil, newI18nError(lang, "embedding:no embedding vector found in response")
	}

	vector := make([]float32, len(response.Response.Data[0].Embedding))
	for i, v := range response.Response.Data[0].Embedding {
		if v != nil {
			vector[i] = float32(*v)
		}
	}
	embeddingResult := &EmbeddingResult{
		TokenCount: int(*response.Response.Usage.TotalTokens),
	}

	err = p.calculatePrice(embeddingResult)
	if err != nil {
		return nil, nil, err
	}

	return vector, embeddingResult, nil
}
