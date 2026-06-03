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
	"bufio"
	"bytes"
	"context"
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
		return &clonedClient
	}

	return &http.Client{}
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
	defer p.deleteSession(sessionID)

	var messageText strings.Builder
	for _, msg := range history {
		if msg.Text == "" {
			continue
		}
		switch msg.Author {
		case "AI":
			messageText.WriteString("Assistant: ")
		case "User":
			messageText.WriteString("User: ")
		}
		messageText.WriteString(msg.Text)
		messageText.WriteString("\n")
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

	// Open SSE stream first so it subscribes to events before any are published
	type sseResult struct {
		result *ModelResult
		err    error
	}
	resultCh := make(chan sseResult, 1)
	go func() {
		r, e := p.readSSEStream(sessionID, question, writer, flusher)
		resultCh <- sseResult{r, e}
	}()

	// Give SSE connection a moment to establish before triggering events
	time.Sleep(100 * time.Millisecond)

	if err := p.sendMessageAsync(sessionID, prompt, messageText.String()); err != nil {
		return nil, err
	}

	res := <-resultCh
	return res.result, res.err
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

func (p *OpenCodeProvider) deleteSession(sessionID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "DELETE", p.serverUrl+"/session/"+sessionID, nil)
	if err != nil {
		return
	}
	p.setAuth(req)

	resp, err := p.client.Do(req)
	if err != nil {
		return
	}
	resp.Body.Close()
}

func (p *OpenCodeProvider) sendMessageAsync(sessionID string, systemPrompt string, text string) error {
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
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", p.serverUrl+"/session/"+sessionID+"/prompt_async", bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}

	p.setAuth(req)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("OpenCode: failed to send message: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("OpenCode: HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

func (p *OpenCodeProvider) readSSEStream(sessionID string, question string, writer io.Writer, flusher http.Flusher) (*ModelResult, error) {
	req, err := http.NewRequest("GET", p.serverUrl+"/event", nil)
	if err != nil {
		return nil, err
	}

	p.setAuth(req)
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")

	ctx, cancel := context.WithTimeout(context.Background(), 1200*time.Second)
	defer cancel()
	req = req.WithContext(ctx)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OpenCode: failed to connect to SSE stream: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenCode: SSE HTTP %d: %s", resp.StatusCode, string(body))
	}

	var fullText strings.Builder
	var promptTokens, completionTokens int
	done := false
	partTypes := make(map[string]string) // partID -> type ("reasoning" or "text")

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()

		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		data := strings.TrimPrefix(line, "data: ")
		if data == "" || data == "[DONE]" {
			continue
		}

		event := p.parseSSEEvent(data)

		if event.Properties == nil {
			continue
		}

		switch event.Type {
		case "message.part.updated":
			part, _ := event.Properties["part"].(map[string]interface{})
			if part == nil {
				continue
			}
			partID, _ := part["id"].(string)
			partType, _ := part["type"].(string)

			// Track part type for routing deltas
			if partID != "" && (partType == "reasoning" || partType == "text") {
				partTypes[partID] = partType
			}

			// Extract token counts from step-finish
			if partType == "step-finish" {
				evtSessionID, _ := event.Properties["sessionID"].(string)
				if evtSessionID == sessionID {
					if tokens, ok := part["tokens"].(map[string]interface{}); ok {
						if p, ok := tokens["input"].(float64); ok {
							promptTokens = int(p)
						}
						if c, ok := tokens["output"].(float64); ok {
							completionTokens = int(c)
						}
					}
				}
			}

		case "message.part.delta":
			evtSessionID, _ := event.Properties["sessionID"].(string)
			if evtSessionID != sessionID {
				continue
			}
			field, _ := event.Properties["field"].(string)
			if field != "text" {
				continue
			}
			delta, _ := event.Properties["delta"].(string)
			if delta == "" {
				continue
			}

			partID, _ := event.Properties["partID"].(string)
			partType := partTypes[partID]

			if partType == "reasoning" {
				fmt.Fprintf(writer, "event: reason\ndata: %s\n\n", delta)
			} else {
				fullText.WriteString(delta)
				fmt.Fprintf(writer, "event: message\ndata: %s\n\n", delta)
			}
			flusher.Flush()

		case "session.status":
			evtSessionID, _ := event.Properties["sessionID"].(string)
			if evtSessionID != sessionID {
				continue
			}
			if status, ok := event.Properties["status"].(map[string]interface{}); ok {
				if st, _ := status["type"].(string); st == "idle" {
					done = true
				}
			}

		case "session.idle":
			evtSessionID, _ := event.Properties["sessionID"].(string)
			if evtSessionID == sessionID {
				done = true
			}
		}

		if done {
			break
		}
	}

	if err := scanner.Err(); err != nil {
		if done {
			// already completed, ignore scanner error (likely from closing connection)
		} else if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("OpenCode: request timed out after 20 minutes")
		} else {
			return nil, fmt.Errorf("OpenCode: SSE stream error: %v", err)
		}
	}

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

type sseEvent struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
}

func (p *OpenCodeProvider) parseSSEEvent(data string) sseEvent {
	var result sseEvent

	// Try format A: { type, properties }
	if err := json.Unmarshal([]byte(data), &result); err == nil && result.Type != "" {
		return result
	}

	// Try format B: { directory, payload: { type, properties } }
	var wrapped struct {
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal([]byte(data), &wrapped); err == nil && len(wrapped.Payload) > 0 {
		json.Unmarshal(wrapped.Payload, &result)
	}

	return result
}

func (p *OpenCodeProvider) setAuth(req *http.Request) {
	if p.apiKey != "" {
		req.SetBasicAuth("opencode", p.apiKey)
	}
}
