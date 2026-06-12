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
	"fmt"

	"github.com/beego/beego/context"
	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// parseOpenAIMessages splits a messages slice into question, system prompt, and prior history.
// History excludes the final user message, which is returned separately as question.
func parseOpenAIMessages(messages []openai.ChatCompletionMessage) (question, systemPrompt string, history []*model.RawMessage, err error) {
	for _, msg := range messages {
		switch msg.Role {
		case "system":
			systemPrompt = msg.Content
		case "user":
			question = msg.Content
			history = append(history, &model.RawMessage{Author: "Human", Text: msg.Content})
		case "assistant":
			history = append(history, &model.RawMessage{Author: "AI", Text: msg.Content})
		}
	}
	if question == "" {
		return "", "", nil, fmt.Errorf("no user message found in the request")
	}
	// Drop the last entry (the final user message) — it's passed as question to QueryText
	if len(history) > 0 {
		history = history[:len(history)-1]
	}
	return question, systemPrompt, history, nil
}

// newOpenAIWriter sets streaming headers when needed and returns a configured OpenAIWriter.
func newOpenAIWriter(rw *context.Response, request openai.ChatCompletionRequest, requestId string) *OpenAIWriter {
	if request.Stream {
		rw.Header().Set("Content-Type", "text/event-stream")
		rw.Header().Set("Cache-Control", "no-cache")
		rw.Header().Set("Connection", "keep-alive")
	}
	return &OpenAIWriter{
		Response:  *rw,
		Buffer:    []byte{},
		RequestID: requestId,
		Stream:    request.Stream,
		Cleaner:   *NewCleaner(6),
		Model:     request.Model,
	}
}

func getOpenAIMessageAuthor(role string) string {
	switch role {
	case "system":
		return "System"
	case "user":
		return "Human"
	case "assistant":
		return "AI"
	default:
		return role
	}
}

// createApiChatSession inserts a Chat, all incoming API messages, and a placeholder AI Message into the DB.
func createApiChatSession(store *object.Store, modelProviderName string, requestMessages []openai.ChatCompletionMessage, requestId string) (*object.Chat, *object.Message, *object.Message, error) {
	now := util.GetCurrentTimeWithMilli()

	chat := &object.Chat{
		Owner:         store.Owner,
		Name:          "chat_api_" + requestId,
		CreatedTime:   now,
		UpdatedTime:   now,
		Store:         store.Name,
		ModelProvider: modelProviderName,
		User:          "api",
	}
	if _, err := object.AddChat(chat); err != nil {
		return nil, nil, nil, err
	}

	var lastUserMsg *object.Message
	lastMessageTime := now
	var lastUserMessageName string
	for i, msg := range requestMessages {
		if msg.Content == "" {
			continue
		}

		messageTime := util.GetCurrentTimeBasedOnLastMilli(lastMessageTime)
		lastMessageTime = messageTime

		message := &object.Message{
			Owner:         store.Owner,
			Name:          fmt.Sprintf("msg_api_%s_%03d", requestId, i),
			CreatedTime:   messageTime,
			Store:         store.Name,
			Chat:          chat.Name,
			Author:        getOpenAIMessageAuthor(msg.Role),
			Text:          msg.Content,
			ModelProvider: modelProviderName,
			User:          "api",
		}
		if msg.Role == "assistant" && lastUserMessageName != "" {
			message.ReplyTo = lastUserMessageName
		}
		if _, err := object.AddMessage(message); err != nil {
			return nil, nil, nil, err
		}
		if msg.Role == "user" {
			lastUserMsg = message
			lastUserMessageName = message.Name
		}
	}

	if lastUserMsg == nil {
		return nil, nil, nil, fmt.Errorf("no user message found in the request")
	}

	aiMsg := &object.Message{
		Owner:         store.Owner,
		Name:          "msg_ai_" + requestId,
		CreatedTime:   util.GetCurrentTimeBasedOnLastMilli(lastMessageTime),
		Store:         store.Name,
		Chat:          chat.Name,
		Author:        "AI",
		ReplyTo:       lastUserMsg.Name,
		ModelProvider: modelProviderName,
		User:          "api",
	}
	if _, err := object.AddMessage(aiMsg); err != nil {
		return nil, nil, nil, err
	}

	return chat, lastUserMsg, aiMsg, nil
}

// applyResultToApiSession writes the AI answer and token counts back to the DB.
func applyResultToApiSession(aiMsg *object.Message, chat *object.Chat, writer *OpenAIWriter, modelResult *model.ModelResult) error {
	aiMsg.Text = writer.MessageString()
	aiMsg.TokenCount = modelResult.TotalTokenCount
	aiMsg.Price = modelResult.TotalPrice
	aiMsg.Currency = modelResult.Currency
	if _, err := object.UpdateMessage(aiMsg.GetId(), aiMsg, false); err != nil {
		return err
	}

	chat.TokenCount += modelResult.TotalTokenCount
	chat.Price += modelResult.TotalPrice
	if chat.Currency == "" {
		chat.Currency = modelResult.Currency
	}
	_, err := object.UpdateChat(chat.GetId(), chat)
	return err
}
