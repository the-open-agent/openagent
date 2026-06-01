// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package model

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/proxy"
)

type OpenCodeProvider struct {
	serverUrl string
	apiKey    string
	client    *http.Client
}

func NewOpenCodeProvider(serverUrl string, apiKey string) (*OpenCodeProvider, error) {
	if serverUrl == "" {
		serverUrl = "http://localhost:4096"
	}
	serverUrl = strings.TrimRight(serverUrl, "/")

	return &OpenCodeProvider{
		serverUrl: serverUrl,
		apiKey:    apiKey,
		client:    newOpenCodeHTTPClient(),
	}, nil
}

func newOpenCodeHTTPClient() *http.Client {
	if proxy.ProxyHttpClient != nil {
		clonedClient := *proxy.ProxyHttpClient
		clonedClient.Timeout = 300 * time.Second
		return &clonedClient
	}

	return &http.Client{
		Timeout: 300 * time.Second,
	}
}

func (p *OpenCodeProvider) GetPricing() string {
	return `OpenCode delegates to underlying LLM providers.
Pricing depends on the provider and model configured in OpenCode.

URL: https://opencode.ai`
}

func (p *OpenCodeProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	if strings.HasPrefix(question, "$OpenAgentDryRun$") {
		return &ModelResult{}, nil
	}

	sessionID, err := p.createSession()
	if err != nil {
		return nil, fmt.Errorf("OpenCode: failed to create session at %s: %v.\n\nMake sure 'opencode serve' is running. You can change the server URL in provider settings.", p.serverUrl, err)
	}

	var messageText strings.Builder
	for _, msg := range history {
		if msg.Author != "AI" {
			messageText.WriteString(msg.Text)
			messageText.WriteString("\n")
		}
	}
	if len(knowledgeMessages) > 0 {
		messageText.WriteString("\n--- Context ---\n")
		for _, msg := range knowledgeMessages {
			messageText.WriteString(msg.Text)
			messageText.WriteString("\n")
		}
		messageText.WriteString("--- End Context ---\n\n")
	}
	messageText.WriteString(question)

	respParts, err := p.sendMessage(sessionID, prompt, messageText.String())
	if err != nil {
		return nil, err
	}

	var fullText strings.Builder
	var promptTokens, completionTokens int

	for _, part := range respParts {
		switch part.Type {
		case "text", "reasoning":
			fullText.WriteString(part.Text)
			fmt.Fprint(writer, part.Text)
		case "step-finish":
			if part.Tokens != nil {
				promptTokens = part.Tokens.Prompt
				completionTokens = part.Tokens.Completion
			}
		}
	}
	flusher.Flush()

	if promptTokens == 0 {
		promptTokens, _ = GetTokenSize("gpt-4", question)
	}
	if completionTokens == 0 {
		completionTokens, _ = GetTokenSize("gpt-4", fullText.String())
	}

	totalTokens := promptTokens + completionTokens

	return &ModelResult{
		PromptTokenCount:   promptTokens,
		ResponseTokenCount:  completionTokens,
		TotalTokenCount:    totalTokens,
		TotalPrice:         0,
		Currency:           "USD",
	}, nil
}

func (p *OpenCodeProvider) ListModels() ([]string, error) {
	return unsupportedListModels("OpenCode")
}

func (p *OpenCodeProvider) createSession() (string, error) {
	req, err := http.NewRequest("POST", p.serverUrl+"/session", bytes.NewReader([]byte("{}")))
	if err != nil {
		return "", err
	}

	p.setAuth(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.ID, nil
}

func (p *OpenCodeProvider) sendMessage(sessionID string, systemPrompt string, text string) ([]openCodeResponsePart, error) {
	reqBody := map[string]interface{}{
		"parts": []map[string]string{
			{"type": "text", "text": text},
		},
	}
	if systemPrompt != "" {
		reqBody["system"] = systemPrompt
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", p.serverUrl+"/session/"+sessionID+"/message", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}

	p.setAuth(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenCode: HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Info  json.RawMessage        `json:"info"`
		Parts []openCodeResponsePart `json:"parts"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Parts, nil
}

func (p *OpenCodeProvider) setAuth(req *http.Request) {
	if p.apiKey != "" {
		req.SetBasicAuth("opencode", p.apiKey)
	}
}

type openCodeResponsePart struct {
	Type   string `json:"type"`
	Text   string `json:"text,omitempty"`
	Tokens *struct {
		Prompt     int `json:"prompt"`
		Completion int `json:"completion"`
		Total      int `json:"total"`
	} `json:"tokens,omitempty"`
}
