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
	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/proxy"
)

func NewAzureModelProvider(typ string, subType string, deploymentName string, secretKey string, temperature float32, topP float32, frequencyPenalty float32, presencePenalty float32, providerUrl string, apiVersion string, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*LocalModelProvider, error) {
	p := &LocalModelProvider{
		typ:                          typ,
		subType:                      subType,
		deploymentName:               deploymentName,
		secretKey:                    secretKey,
		temperature:                  temperature,
		topP:                         topP,
		frequencyPenalty:             frequencyPenalty,
		presencePenalty:              presencePenalty,
		providerUrl:                  providerUrl,
		apiVersion:                   apiVersion,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}
	return p, nil
}

func getAzureClientFromToken(deploymentName string, authToken string, url string, apiVersion string) *openai.Client {
	config := openai.DefaultAzureConfig(authToken, url)
	config.HTTPClient = proxy.ProxyHttpClient
	if apiVersion != "" {
		config.APIVersion = apiVersion
	}
	if deploymentName != "" {
		config.AzureModelMapperFunc = func(model string) string {
			azureModelMapping := map[string]string{
				model: deploymentName,
			}
			return azureModelMapping[model]
		}
	}

	c := openai.NewClientWithConfig(config)
	return c
}
