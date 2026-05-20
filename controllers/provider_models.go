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

package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ProviderModelRequest struct {
	Type         string `json:"type"`
	ProviderURL  string `json:"providerUrl"`
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	Region       string `json:"region"`
}

type ProviderModelOption struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Deprecated bool   `json:"deprecated,omitempty"`
	Source     string `json:"source,omitempty"`
}

type ProviderModelsResponse struct {
	Items       []ProviderModelOption `json:"items"`
	Source      string                `json:"source"`
	FallbackMsg string                `json:"fallbackMsg,omitempty"`
}

// GetProviderModels
// @Title GetProviderModels
// @Tag Provider API
// @Description get provider model catalog by provider type
// @router /get-provider-models [post]
func (c *ApiController) GetProviderModels() {
	if !c.RequireAdmin() {
		return
	}

	var req ProviderModelRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &req); err != nil {
		c.ResponseError(err.Error())
		return
	}

	req.Type = strings.TrimSpace(req.Type)
	if req.Type == "" {
		c.ResponseError("provider type is required")
		return
	}

	items, err := fetchProviderModelsDynamic(req)
	if err != nil || len(items) == 0 {
		resp := ProviderModelsResponse{
			Items:       []ProviderModelOption{},
			Source:      "fallback",
			FallbackMsg: "dynamic model fetch failed, use static fallback",
		}
		c.ResponseOk(resp)
		return
	}

	for i := range items {
		items[i].Source = "dynamic"
	}

	c.ResponseOk(ProviderModelsResponse{
		Items:  items,
		Source: "dynamic",
	})
}

func fetchProviderModelsDynamic(req ProviderModelRequest) ([]ProviderModelOption, error) {
	switch req.Type {
	case "OpenAI":
		return fetchOpenAIStyleModels("https://api.openai.com/v1/models", req.ClientSecret, nil)
	case "DeepSeek":
		// DeepSeek provides an OpenAI-compatible API surface.
		return fetchOpenAIStyleModels("https://api.deepseek.com/v1/models", req.ClientSecret, nil)
	case "Grok":
		return fetchOpenAIStyleModels("https://api.x.ai/v1/models", req.ClientSecret, nil)
	case "OpenRouter":
		return fetchOpenAIStyleModels("https://openrouter.ai/api/v1/models", req.ClientSecret, nil)
	case "Mistral":
		return fetchOpenAIStyleModels("https://api.mistral.ai/v1/models", req.ClientSecret, nil)
	case "Moonshot":
		return fetchOpenAIStyleModels("https://api.moonshot.cn/v1/models", req.ClientSecret, nil)
	case "Gemini":
		return fetchGeminiModels(req.ClientSecret)
	case "Amazon Bedrock":
		// Bedrock model listing requires AWS account credentials and region-aware IAM setup.
		// Keep static fallback for now.
		return nil, fmt.Errorf("bedrock dynamic listing is not enabled")
	case "Azure":
		// Azure uses deployment names and region/account-specific availability.
		// Keep static fallback for now.
		return nil, fmt.Errorf("azure dynamic listing is not enabled")
	default:
		return nil, fmt.Errorf("dynamic model listing is not supported for provider type: %s", req.Type)
	}
}

func fetchOpenAIStyleModels(endpoint string, apiKey string, headers map[string]string) ([]ProviderModelOption, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("api key is required")
	}

	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	httpClient := &http.Client{Timeout: 12 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("provider returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Data []struct {
			ID      string `json:"id"`
			Name    string `json:"name"`
			Created int64  `json:"created"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	items := make([]ProviderModelOption, 0, len(payload.Data))
	seen := map[string]struct{}{}
	for _, item := range payload.Data {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		items = append(items, ProviderModelOption{
			ID:         id,
			Name:       id,
			Deprecated: isLikelyDeprecatedModel(id),
		})
	}
	return items, nil
}

func fetchGeminiModels(apiKey string) ([]ProviderModelOption, error) {
	if strings.TrimSpace(apiKey) == "" {
		return nil, fmt.Errorf("api key is required")
	}
	u, err := url.Parse("https://generativelanguage.googleapis.com/v1beta/models")
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("key", apiKey)
	u.RawQuery = q.Encode()

	req, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	httpClient := &http.Client{Timeout: 12 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return nil, fmt.Errorf("provider returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	items := make([]ProviderModelOption, 0, len(payload.Models))
	seen := map[string]struct{}{}
	for _, model := range payload.Models {
		name := strings.TrimSpace(model.Name)
		if strings.HasPrefix(name, "models/") {
			name = strings.TrimPrefix(name, "models/")
		}
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		items = append(items, ProviderModelOption{
			ID:         name,
			Name:       name,
			Deprecated: isLikelyDeprecatedModel(name),
		})
	}
	return items, nil
}

func isLikelyDeprecatedModel(modelID string) bool {
	id := strings.ToLower(strings.TrimSpace(modelID))
	deprecatedPrefixes := []string{
		"text-davinci-",
		"text-curie-",
		"text-babbage-",
		"text-ada-",
	}
	for _, prefix := range deprecatedPrefixes {
		if strings.HasPrefix(id, prefix) {
			return true
		}
	}
	deprecatedExact := map[string]struct{}{
		"gpt-3.5-turbo":  {},
		"claude-instant": {},
	}
	_, ok := deprecatedExact[id]
	return ok
}
