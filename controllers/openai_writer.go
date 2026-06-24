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
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/beego/beego/context"
	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/util"
)

// OpenAIWriter implements a writer that formats responses in OpenAI format
type OpenAIWriter struct {
	context.Response
	Cleaner    Cleaner
	Buffer     []byte
	MessageBuf []byte
	ToolBuf    []byte
	RequestID  string
	Stream     bool
	StreamSent bool
	Model      string
}

func getOpenAIEventData(p []byte, eventType string) string {
	prefix := []byte(fmt.Sprintf("event: %s\ndata: ", eventType))
	suffix := []byte("\n\n")
	return string(bytes.TrimSuffix(bytes.TrimPrefix(p, prefix), suffix))
}

// Write processes incoming data chunks and formats them for OpenAI compatibility
func (w *OpenAIWriter) Write(p []byte) (n int, err error) {
	if len(p) > 0 && p[0] == ':' {
		if !w.Stream {
			return len(p), nil
		}
		n, err = w.ResponseWriter.Write(p)
		if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
			flusher.Flush()
		}
		return n, err
	}

	// Always store the original bytes.
	w.Buffer = append(w.Buffer, p...)

	// Parse the incoming SSE message format
	var content string

	if bytes.HasPrefix(p, []byte("event: message\ndata: ")) {
		content = getOpenAIEventData(p, "message")

		// Add content to message buffer
		w.MessageBuf = append(w.MessageBuf, []byte(content)...)
	} else if bytes.HasPrefix(p, []byte("event: reason\ndata: ")) {
		return len(p), nil
	} else if bytes.HasPrefix(p, []byte("event: tool-delta\ndata: ")) || bytes.HasPrefix(p, []byte("event: tool-start\ndata: ")) {
		return len(p), nil
	} else if bytes.HasPrefix(p, []byte("event: tool\ndata: ")) {
		if len(w.ToolBuf) > 0 {
			w.ToolBuf = append(w.ToolBuf, '\n')
		}
		w.ToolBuf = append(w.ToolBuf, []byte(getOpenAIEventData(p, "tool"))...)
		return len(p), nil
	} else if bytes.HasPrefix(p, []byte("event: search\ndata: ")) {
		return len(p), nil
	} else {
		// If we can't parse, just store the raw bytes and attempt to clean
		content = w.Cleaner.CleanString(string(p))
		if content != "" {
			w.MessageBuf = append(w.MessageBuf, []byte(content)...)
		}
	}

	// For non-streaming, just collect the data
	if !w.Stream {
		return len(p), nil
	}

	// Skip empty content
	if content == "" {
		return len(p), nil
	}

	// Create SSE chunk using go-openai library structure
	chunk := openai.ChatCompletionStreamResponse{
		ID:      "chatcmpl-" + w.RequestID,
		Object:  "chat.completion.chunk",
		Created: util.GetCurrentUnixTime(),
		Model:   w.Model,
		Choices: []openai.ChatCompletionStreamChoice{
			{
				Index: 0,
				Delta: openai.ChatCompletionStreamChoiceDelta{
					Content: content,
				},
				FinishReason: openai.FinishReasonNull,
			},
		},
	}

	jsonData, err := json.Marshal(chunk)
	if err != nil {
		return 0, err
	}

	// Send as SSE data chunk - use ResponseWriter to avoid recursion
	_, err = w.ResponseWriter.Write([]byte(fmt.Sprintf("data: %s\n\n", jsonData)))
	if err != nil {
		return 0, err
	}

	w.StreamSent = true
	w.Flush()

	return len(p), nil
}

// MessageString returns the complete buffered message
func (w *OpenAIWriter) MessageString() string {
	return string(w.MessageBuf)
}

func (w *OpenAIWriter) ToolString() string {
	return string(w.ToolBuf)
}

// Close finalizes the stream by sending completion message and DONE marker
func (w *OpenAIWriter) Close(promptTokens, completionTokens, totalTokens int) error {
	if !w.Stream {
		return nil
	}

	if w.StreamSent {
		// Send final message with finish_reason
		chunk := openai.ChatCompletionStreamResponse{
			ID:      "chatcmpl-" + w.RequestID,
			Object:  "chat.completion.chunk",
			Created: util.GetCurrentUnixTime(),
			Model:   w.Model,
			Choices: []openai.ChatCompletionStreamChoice{
				{
					Index:        0,
					Delta:        openai.ChatCompletionStreamChoiceDelta{}, // Empty delta
					FinishReason: openai.FinishReasonStop,
				},
			},
		}

		jsonData, err := json.Marshal(chunk)
		if err != nil {
			return err
		}

		_, err = w.ResponseWriter.Write([]byte(fmt.Sprintf("data: %s\n\n", jsonData)))
		if err != nil {
			return err
		}

		// Send usage information as an OpenAI-compatible stream chunk.
		usageChunk := openai.ChatCompletionStreamResponse{
			ID:      "chatcmpl-" + w.RequestID,
			Object:  "chat.completion.chunk",
			Created: util.GetCurrentUnixTime(),
			Model:   w.Model,
			Choices: []openai.ChatCompletionStreamChoice{},
			Usage: &openai.Usage{
				PromptTokens:     promptTokens,
				CompletionTokens: completionTokens,
				TotalTokens:      totalTokens,
			},
		}

		usageData, err := json.Marshal(usageChunk)
		if err != nil {
			return err
		}

		_, err = w.ResponseWriter.Write([]byte(fmt.Sprintf("data: %s\n\n", usageData)))
		if err != nil {
			return err
		}

		// Final [DONE] marker for SSE
		_, err = w.ResponseWriter.Write([]byte("data: [DONE]\n\n"))
		if err != nil {
			return err
		}

		w.Flush()
	}

	return nil
}
