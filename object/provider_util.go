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

package object

import (
	"fmt"

	"github.com/the-open-agent/openagent/agent"
	"github.com/the-open-agent/openagent/embedding"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/util"
	"github.com/the-open-agent/openagent/video"
)

func getModelProviderFromName(owner string, providerName string, lang string) (*Provider, model.ModelProvider, error) {
	var provider *Provider
	var err error
	if providerName != "" {
		provider, err = GetProviderByOwnerAndName(owner, providerName)
	} else {
		provider, err = GetDefaultModelProvider()
	}
	if err != nil {
		return nil, nil, err
	}
	if provider == nil {
		if providerName != "" {
			return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:The model provider: %s is not found"), providerName)
		} else {
			return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:Please add a model provider first"))
		}
	}

	if provider.Category != "Model" {
		return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:The model provider: %s is expected to be \")Model\" category, got: \"%s\""), provider.GetId(), provider.Category)
	}
	if provider.ClientSecret == "" && provider.Type != "Dummy" && provider.Type != "Ollama" {
		return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:The model provider: %s's client secret should not be empty"), provider.GetId())
	}

	providerObj, err := provider.GetModelProvider(lang)
	if err != nil {
		return nil, nil, err
	}

	return provider, providerObj, err
}

func getEmbeddingProviderFromName(owner string, providerName string, lang string) (*Provider, embedding.EmbeddingProvider, error) {
	var provider *Provider
	var err error
	if providerName != "" {
		provider, err = GetProviderByOwnerAndName(owner, providerName)
	} else {
		provider, err = GetDefaultEmbeddingProvider()
	}
	if err != nil {
		return nil, nil, err
	}
	if provider == nil {
		if providerName != "" {
			return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:The embedding provider: %s is not found"), providerName)
		} else {
			return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:Please add an embedding provider first"))
		}
	}

	if provider.Category != "Embedding" {
		return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:The embedding provider: %s is expected to be \")Embedding\" category, got: \"%s\""), provider.GetId(), provider.Category)
	}
	if provider.ClientSecret == "" && provider.Type != "Dummy" {
		return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:The embedding provider: %s's client secret should not be empty"), provider.GetId())
	}

	providerObj, err := provider.GetEmbeddingProvider(lang)
	if err != nil {
		return nil, nil, err
	}

	return provider, providerObj, err
}

func getAgentProviderFromName(owner string, providerName string, lang string) (*Provider, agent.AgentProvider, error) {
	var provider *Provider
	var err error
	if providerName != "" {
		provider, err = GetProviderByOwnerAndName(owner, providerName)
	} else {
		provider, err = GetDefaultAgentProvider()
	}
	if err != nil {
		return nil, nil, err
	}
	if provider == nil {
		return nil, nil, nil
	}

	if provider.Category != "Agent" {
		return nil, nil, fmt.Errorf(i18n.Translate(lang, "object:The agent provider: %s is expected to be \")Agent\" category, got: \"%s\""), provider.GetId(), provider.Category)
	}

	providerObj, err := provider.GetAgentProvider(lang)
	if err != nil {
		return nil, nil, err
	}

	return provider, providerObj, err
}

func SetDefaultVodClient(lang string) error {
	if video.VodClient != nil {
		return nil
	}

	provider, err := GetDefaultVideoProvider()
	if err != nil {
		return err
	}
	if provider == nil {
		return fmt.Errorf(i18n.Translate(lang, "object:The default video provider should not be empty"))
	}

	err = video.SetVodClient(provider.Region, provider.ClientId, provider.ClientSecret)
	return err
}

func getActiveCloudProviders(owner string) ([]*Provider, error) {
	providers, err := GetProviders("admin")
	if err != nil {
		return nil, err
	}

	res := []*Provider{}
	for _, provider := range providers {
		if provider.ClientId != "" && provider.ClientSecret != "" && (provider.Category == "Public Cloud" || provider.Category == "Private Cloud") && provider.State == "Active" {
			res = append(res, provider)
		}
	}
	return res, nil
}

func GetActiveBlockchainProvider(owner string) (*Provider, error) {
	providers, err := GetProviders(owner)
	if err != nil {
		return nil, err
	}

	for _, provider := range providers {
		if provider.Category == "Blockchain" && provider.IsDefault && provider.State == "Active" {
			return provider, nil
		}
	}

	for _, provider := range providers {
		if ((provider.ClientId != "" && provider.ClientSecret != "") || (provider.ClientSecret != "" && provider.Type == "Ethereum") || provider.Type == "ChainMaker") && provider.Category == "Blockchain" && provider.State == "Active" {
			return provider, nil
		}
	}
	return nil, nil
}

func GetTwoActiveBlockchainProvider(owner string) (*Provider, *Provider, error) {
	providers, err := GetProviders(owner)
	if err != nil {
		return nil, nil, err
	}

	var providerFirst, providerSecond *Provider
	// Try to find the first default active blockchain provider
	for _, provider := range providers {
		if provider.Category == "Blockchain" && provider.IsDefault && provider.State == "Active" {
			providerFirst = provider
			break
		}
	}

	// If the first provider is not found, try to find the first active blockchain provider,
	// then find the second active blockchain provider
	for _, provider := range providers {
		if ((provider.ClientId != "" && provider.ClientSecret != "") || (provider.ClientSecret != "" && provider.Type == "Ethereum") || provider.Type == "ChainMaker") && provider.Category == "Blockchain" && provider.State == "Active" {
			if providerFirst == nil {
				providerFirst = provider
			} else if provider.GetId() != providerFirst.GetId() {
				providerSecond = provider
				break
			}
		}
	}
	return providerFirst, providerSecond, nil
}

func generateProviderKey() string {
	return fmt.Sprintf("sk-%s", util.GetRandomString(24))
}
