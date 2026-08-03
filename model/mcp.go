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

package model

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/openai/openai-go/v2/responses"
	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/audit"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/mcp"
	"github.com/the-open-agent/openagent/tool"
)

type ToolMessages struct {
	Messages         []*RawMessage
	ReasoningContent string
	ToolCalls        any
}

type ToolSession struct {
	McpToolSet   *mcp.ToolSet
	ToolMessages *ToolMessages
	IsVision     bool
	// SessionID identifies the chat/session these tool calls belong to. It is
	// stamped onto every audit event so the audit log lands in one file per
	// session; empty falls back to a shared file.
	SessionID string
}

type ToolCallResponse struct {
	Success  bool        `json:"success"`
	Data     interface{} `json:"data"`
	Error    string      `json:"error,omitempty"`
	ToolName string      `json:"toolName"`
}

type ToolCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
	Content   string `json:"content"`
	IsError   bool   `json:"isError"`
}

const toolErrorRecoveryPrompt = "The previous tool call failed. Do not finish as if the task is complete. If possible, recover by calling the appropriate tool again with corrected arguments or a different tool. If recovery is not possible, clearly explain what is blocked and what input or condition is needed."

type ToolCallDelta struct {
	Index          int    `json:"index"`
	ID             string `json:"id,omitempty"`
	Name           string `json:"name,omitempty"`
	ArgumentsDelta string `json:"argumentsDelta,omitempty"`
}

func flushToolCallDelta(index int, id string, name string, argumentsDelta string, writer io.Writer, lang string) error {
	if name == "" && argumentsDelta == "" {
		return nil
	}

	payload, err := json.Marshal(ToolCallDelta{
		Index:          index,
		ID:             id,
		Name:           name,
		ArgumentsDelta: argumentsDelta,
	})
	if err != nil {
		return err
	}
	return flushDataThink(string(payload), "tool-delta", writer, lang)
}

func reverseToolsToOpenAi(tools []*protocol.Tool) ([]openai.Tool, error) {
	var openaiTools []openai.Tool
	for _, tool := range tools {
		schemaBytes, err := json.Marshal(tool.InputSchema)
		if err != nil {
			return nil, err
		}

		var parameters map[string]interface{}
		if err := json.Unmarshal(schemaBytes, &parameters); err != nil {
			return nil, err
		}
		normalizeToolParametersSchema(parameters)
		openaiTools = append(openaiTools, openai.Tool{
			Type: "function",
			Function: &openai.FunctionDefinition{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  parameters,
			},
		})
	}
	return openaiTools, nil
}

func normalizeToolParametersSchema(parameters map[string]interface{}) {
	if parameters["type"] == "object" {
		if _, ok := parameters["properties"]; !ok {
			parameters["properties"] = map[string]interface{}{}
		}
	}
}

func handleToolCallsParameters(toolCall openai.ToolCall, toolCalls []openai.ToolCall, toolCallsMap map[int]int) ([]openai.ToolCall, map[int]int) {
	if toolCallsMap == nil {
		toolCallsMap = make(map[int]int)
	}

	idx := *toolCall.Index
	if existingIdx, exists := toolCallsMap[idx]; exists {
		if toolCall.Function.Name != "" {
			toolCalls[existingIdx].Function.Name = toolCall.Function.Name
		}
		if toolCall.Function.Arguments != "" {
			toolCalls[existingIdx].Function.Arguments += toolCall.Function.Arguments
		}
	} else {
		newIdx := len(toolCalls)
		toolCallsMap[idx] = newIdx
		toolCalls = append(toolCalls, toolCall)
	}
	return toolCalls, toolCallsMap
}

func normalizeToolCalls(toolSession *ToolSession) []openai.ToolCall {
	if toolSession.ToolMessages.ToolCalls == nil {
		return nil
	}
	toolCalls, ok := toolSession.ToolMessages.ToolCalls.([]openai.ToolCall)
	if ok {
		return toolCalls
	}
	responseFunctionToolCalls, ok := toolSession.ToolMessages.ToolCalls.([]responses.ResponseFunctionToolCall)
	if !ok {
		return nil
	}
	result := make([]openai.ToolCall, 0, len(responseFunctionToolCalls))
	for _, tc := range responseFunctionToolCalls {
		result = append(result, openai.ToolCall{
			ID:       tc.ID,
			Type:     "function",
			Function: openai.FunctionCall{Name: tc.Name, Arguments: tc.Arguments},
		})
	}
	return result
}

func QueryTextWithTools(p ModelProvider, question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	var messages []*RawMessage

	toolCount := 0
	if toolSession.McpToolSet != nil {
		toolCount = len(toolSession.McpToolSet.Tools)
		if toolSession.McpToolSet.WebSearchEnabled {
			toolCount++
		}
	}
	fmt.Printf("\n--- LLM Call (Round 0) | Tools available: [%d] ---\n", toolCount)

	modelResult, err := p.QueryText(question, writer, history, prompt, knowledgeMessages, toolSession, lang)
	if err != nil {
		return nil, err
	}

	toolCalls := normalizeToolCalls(toolSession)
	if len(toolCalls) == 0 {
		fmt.Printf("LLM Decision: [Final Answer — no tool calls]\n")
		return modelResult, nil
	}

	round := 0
	for len(toolCalls) > 0 {
		round++
		fmt.Printf("\n--- Agent Round %d | LLM Decision: [%d tool call(s)] ---\n", round, len(toolCalls))
		for i, tc := range toolCalls {
			fmt.Printf("  Tool %d: [%s] args: %s\n", i+1, tc.Function.Name, tc.Function.Arguments)
		}

		roundHasToolError := false
		var roundImages []ImageAttachment
		for _, toolCall := range toolCalls {
			serverName, toolName := mcp.GetServerNameAndToolNameFromId(toolCall.Function.Name)

			messages = append(messages, &RawMessage{
				Text:             "",
				Author:           "AI",
				ReasoningContent: toolSession.ToolMessages.ReasoningContent,
				ToolCall:         toolCall,
			})

			var toolFailed bool
			var images []ImageAttachment
			messages, images, toolFailed, err = callMcpTool(toolCall, serverName, toolName, toolSession.SessionID, toolSession.IsVision, toolSession.McpToolSet, messages, writer, lang)
			if err != nil {
				return nil, err
			}
			roundImages = append(roundImages, images...)
			if toolFailed {
				roundHasToolError = true
			}
		}
		if len(roundImages) > 0 {
			messages = append(messages, &RawMessage{
				Text:   "Images returned by image_search, in the same order as the result metadata.",
				Author: "User",
				Images: roundImages,
			})
		}

		toolSession.ToolMessages.Messages = messages
		fmt.Printf("\n--- LLM Call (Round %d) | Tool results fed back ---\n", round)
		modelResult, err = p.QueryText(question, writer, history, prompt, knowledgeMessages, toolSession, lang)
		if err != nil {
			return nil, err
		}

		toolCalls = normalizeToolCalls(toolSession)
		if len(toolCalls) == 0 && roundHasToolError {
			messages = append(messages, &RawMessage{
				Text:   toolErrorRecoveryPrompt,
				Author: "System",
			})
			toolSession.ToolMessages.Messages = messages

			fmt.Printf("\n--- LLM Call (Round %d recovery) | Tool error recovery prompt added ---\n", round)
			modelResult, err = p.QueryText(question, writer, history, prompt, knowledgeMessages, toolSession, lang)
			if err != nil {
				return nil, err
			}

			toolCalls = normalizeToolCalls(toolSession)
		}
	}

	fmt.Printf("LLM Decision: [Final Answer — no more tool calls after round %d]\n", round)

	for _, conn := range toolSession.McpToolSet.Connections {
		conn.Close()
	}
	return modelResult, nil
}

func createToolMessage(toolCall openai.ToolCall, text string) *RawMessage {
	return &RawMessage{
		Text:       text,
		Author:     "Tool",
		ToolCallID: toolCall.ID,
	}
}

func startHeartbeat(writer io.Writer, mu *sync.Mutex) chan<- struct{} {
	stop := make(chan struct{})
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				mu.Lock()
				if flusher, ok := writer.(http.Flusher); ok {
					_, _ = fmt.Fprint(writer, ":keepalive\n\n")
					flusher.Flush()
				}
				mu.Unlock()
			case <-stop:
				return
			}
		}
	}()
	return stop
}

func callMcpTool(toolCall openai.ToolCall, serverName, toolName, sessionID string, isVision bool, mcpToolSet *mcp.ToolSet, messages []*RawMessage, writer io.Writer, lang string) ([]*RawMessage, []ImageAttachment, bool, error) {
	var arguments map[string]interface{}
	ctx := tool.WithModelVision(context.Background(), isVision)

	// One audit event is emitted for every exit path, including the early
	// failures below - a malformed-argument call and a call to an unregistered
	// tool are exactly what an audit log must not miss. The deferred Record runs
	// whichever way the function returns; each path sets the final outcome.
	start := time.Now()
	auditEvent := audit.Event{
		Type:            "tool_call",
		Tool:            toolName,
		Server:          serverName,
		SessionID:       sessionID,
		ArgumentsLength: len(toolCall.Function.Arguments),
		Outcome:         "attempted",
	}
	defer func() {
		auditEvent.DurationMs = time.Since(start).Milliseconds()
		audit.Record(auditEvent)
	}()

	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &arguments); err != nil {
		auditEvent.Outcome = "failure"
		return nil, nil, false, fmt.Errorf(i18n.Translate(lang, "model:failed to parse tool arguments: %v"), err)
	}

	// Send tool-start event immediately so the frontend can show the tool call before execution
	toolStartData := ToolCall{
		Name:      toolCall.Function.Name,
		Arguments: toolCall.Function.Arguments,
		Content:   "",
		IsError:   false,
	}
	toolStartJSON, err := json.Marshal(toolStartData)
	if err == nil {
		_ = flushDataThink(string(toolStartJSON), "tool-start", writer, lang)
	}

	var mu sync.Mutex
	var result *protocol.CallToolResult

	heartbeat := startHeartbeat(writer, &mu)
	defer close(heartbeat)

	if serverName == "" {
		// builtin tools
		if mcpToolSet.BuiltinTools == nil {
			auditEvent.Outcome = "not_found"
			return messages, nil, false, nil
		}
		result, err = mcpToolSet.BuiltinTools.ExecuteTool(ctx, toolName, arguments)
	} else {
		// MCP server tools
		conn, ok := mcpToolSet.Connections[serverName]
		if !ok {
			auditEvent.Outcome = "not_found"
			return messages, nil, false, nil
		}
		req := &protocol.CallToolRequest{
			Name:      toolName,
			Arguments: arguments,
		}
		result, err = conn.CallTool(ctx, req)
	}

	response := &ToolCallResponse{
		ToolName: toolCall.Function.Name,
	}
	var images []ImageAttachment
	var responseContent []protocol.Content
	if result != nil {
		for _, content := range result.Content {
			if imageContent, ok := content.(*protocol.ImageContent); ok {
				images = append(images, ImageAttachment{
					Data:     imageContent.Data,
					MimeType: imageContent.MimeType,
				})
				continue
			}
			responseContent = append(responseContent, content)
		}
	}

	if err != nil {
		response.Success = false
		response.Error = err.Error()
	} else if result.IsError {
		response.Success = false
		contentBytes, err := json.Marshal(responseContent)
		if err != nil {
			response.Error = fmt.Sprintf(i18n.Translate(lang, "model:failed to marshal error content: %v"), err)
		} else {
			response.Error = string(contentBytes)
		}
	} else {
		response.Success = true
		contentBytes, err := json.Marshal(responseContent)
		if err != nil {
			response.Data = fmt.Sprintf(i18n.Translate(lang, "model:failed to marshal content: %v"), err)
		} else {
			response.Data = string(contentBytes)
		}
	}

	auditEvent.Outcome = "success"
	if !response.Success {
		auditEvent.Outcome = "failure"
	}

	responseJson, err := json.Marshal(response)
	if err != nil {
		return nil, nil, false, fmt.Errorf(i18n.Translate(lang, "model:failed to marshal tool response: %v"), err)
	}

	var contentStr string
	if !response.Success {
		contentStr = response.Error
	} else {
		contentStr = response.Data.(string)
	}

	fmt.Printf("Tool Result: [%s]\n", contentStr)
	isError := !response.Success

	toolData := ToolCall{
		Name:      toolCall.Function.Name,
		Arguments: toolCall.Function.Arguments,
		Content:   contentStr,
		IsError:   isError,
	}
	toolJSON, err := json.Marshal(toolData)
	if err == nil {
		mu.Lock()
		if err := flushDataThink(string(toolJSON), "tool", writer, lang); err == nil {
		}
		mu.Unlock()
	}

	messages = append(messages, createToolMessage(toolCall, string(responseJson)))
	return messages, images, !response.Success, nil
}

func GetToolCallsFromWriter(toolMessage string) []ToolCall {
	if toolMessage == "" {
		return nil
	}
	var toolCalls []ToolCall
	toolCallLines := strings.Split(toolMessage, "\n")
	for _, line := range toolCallLines {
		if line == "" {
			continue
		}
		var toolCall ToolCall
		if err := json.Unmarshal([]byte(line), &toolCall); err == nil {
			toolCalls = append(toolCalls, toolCall)
		}
	}
	return toolCalls
}
