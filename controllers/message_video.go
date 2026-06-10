// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
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
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/video"
)

const (
	videoGenerationTaskTimeout      = 10 * time.Minute
	videoGenerationTaskPollInterval = 5 * time.Second
	videoGenerationRequestTimeout   = 60 * time.Second
)

type responseWriterContext interface {
	Context() context.Context
}

func videoGenerationContext(responseWriter http.ResponseWriter) context.Context {
	if provider, ok := responseWriter.(responseWriterContext); ok {
		return provider.Context()
	}
	return context.Background()
}

func getVideoGenerationQuestion(questionMessage *object.Message, question string, host string, lang string) (string, error) {
	if questionMessage == nil {
		return question, nil
	}

	if strings.Contains(questionMessage.Text, ";base64,") && strings.Contains(questionMessage.Text, "data:") {
		origin := getOriginFromHost(host)
		if err := storeInlineBase64Images(questionMessage, origin, lang); err != nil {
			return "", err
		}
		return questionMessage.Text, nil
	}

	return question, nil
}

func getVideoGenerationRequest(questionMessage *object.Message, question string, host string, lang string) (*video.GenerationRequest, error) {
	question, err := getVideoGenerationQuestion(questionMessage, question, host, lang)
	if err != nil {
		return nil, err
	}
	imageText, messageText, err := model.ExtractFirstImageDataURL(question)
	if err != nil {
		return nil, err
	}

	request := &video.GenerationRequest{
		Prompt: strings.TrimSpace(messageText),
	}
	request.ImageURL = imageText
	if request.Prompt == "" && request.ImageURL != "" {
		request.Prompt = "Generate a video based on the first frame image."
	} else if request.Prompt == "" {
		request.Prompt = strings.TrimSpace(question)
	}
	return request, nil
}

func finalizeVideoMessageAnswer(message *object.Message, chat *object.Chat, provider *object.Provider, result *video.GenerationResult, answer string) error {
	message.Text = answer
	message.TokenCount = result.TotalTokenCount
	message.Price = result.Price
	message.Currency = result.Currency
	message.ErrorText = ""
	message.IsAlerted = false
	message.Suggestions = nil
	message.VectorScores = nil
	message.SearchResults = nil
	message.ToolCalls = nil
	message.ReasonText = ""

	if err := object.AddTransactionForMessage(message); err != nil {
		return err
	}

	if _, err := object.UpdateMessage(message.GetId(), message, false); err != nil {
		return err
	}

	latestChat, err := object.GetChat(chat.GetId())
	if err != nil {
		return err
	}
	if latestChat != nil {
		chat = latestChat
	}

	chat.TokenCount += message.TokenCount
	chat.Price += message.Price
	if chat.Currency == "" {
		chat.Currency = message.Currency
	}
	if chat.ModelProvider == "" {
		chat.ModelProvider = provider.Name
	}
	chat.IsGenerating = false

	if _, err := object.UpdateChat(chat.GetId(), chat); err != nil {
		return err
	}

	return nil
}

func handleVideoMessageAnswer(responseWriter http.ResponseWriter, message *object.Message, chat *object.Chat, provider *object.Provider, videoProvider video.VideoProvider, questionMessage *object.Message, question string, host string, lang string) error {
	ctx := videoGenerationContext(responseWriter)
	if err := writeInfoStream(responseWriter, "Submitting video generation task..."); err != nil {
		return err
	}

	request, err := getVideoGenerationRequest(questionMessage, question, host, lang)
	if err != nil {
		return err
	}

	createCtx, cancel := context.WithTimeout(ctx, videoGenerationRequestTimeout)
	task, err := videoProvider.CreateVideoTask(createCtx, request, lang)
	cancel()
	if ctx.Err() != nil {
		return errMessageAnswerCanceled
	}
	if err != nil {
		return err
	}
	if task == nil || task.TaskID == "" {
		return fmt.Errorf("video generation task create failed: missing task id")
	}
	if err = writeInfoStream(responseWriter, fmt.Sprintf("Video generation task submitted: %s", task.TaskID)); err != nil {
		return err
	}

	result, err := waitVideoGenerationTask(ctx, responseWriter, videoProvider, task.TaskID, lang)
	if err != nil {
		return err
	}

	answer := fmt.Sprintf("Video generation succeeded.\n\n[Download generated video](%s)", result.VideoURL)
	jsonData, err := ConvertMessageDataToJSON(answer)
	if err != nil {
		return err
	}
	if _, err = responseWriter.Write([]byte(fmt.Sprintf("event: message\ndata: %s\n\n", jsonData))); err != nil {
		return err
	}
	if flusher, ok := responseWriter.(http.Flusher); ok {
		flusher.Flush()
	}

	if err := finalizeVideoMessageAnswer(message, chat, provider, result, answer); err != nil {
		return err
	}

	_, err = responseWriter.Write([]byte("event: end\ndata: end\n\n"))
	if err != nil {
		return err
	}
	if flusher, ok := responseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
	return nil
}

func waitVideoGenerationTask(ctx context.Context, responseWriter http.ResponseWriter, videoProvider video.VideoProvider, taskID string, lang string) (*video.GenerationResult, error) {
	taskCtx, cancelTask := context.WithTimeout(ctx, videoGenerationTaskTimeout)
	defer cancelTask()

	ticker := time.NewTicker(videoGenerationTaskPollInterval)
	defer ticker.Stop()

	for {
		if ctx.Err() != nil {
			return nil, errMessageAnswerCanceled
		}
		if taskCtx.Err() != nil {
			return nil, fmt.Errorf("video generation task %s timed out", taskID)
		}

		queryCtx, cancel := context.WithTimeout(taskCtx, videoGenerationRequestTimeout)
		result, err := videoProvider.GetVideoTaskResult(queryCtx, taskID, lang)
		cancel()
		if ctx.Err() != nil {
			return nil, errMessageAnswerCanceled
		}
		if taskCtx.Err() != nil {
			return nil, fmt.Errorf("video generation task %s timed out", taskID)
		}
		if err != nil {
			return nil, err
		}
		if result == nil {
			return nil, fmt.Errorf("video generation task %s returned empty status", taskID)
		}

		switch result.Status {
		case video.GenerationTaskStatusSucceeded:
			if result.Result == nil {
				return nil, fmt.Errorf("video generation task %s succeeded but no result was returned", taskID)
			}
			return result.Result, nil
		case video.GenerationTaskStatusFailed:
			if result.ErrorMessage != "" {
				return nil, fmt.Errorf("video generation task %s failed: %s", taskID, result.ErrorMessage)
			}
			return nil, fmt.Errorf("video generation task %s failed", taskID)
		}

		select {
		case <-ctx.Done():
			return nil, errMessageAnswerCanceled
		case <-taskCtx.Done():
			return nil, fmt.Errorf("video generation task %s timed out", taskID)
		case <-ticker.C:
			if err = writeInfoStream(responseWriter, fmt.Sprintf("Video generation task %s is still running...", taskID)); err != nil {
				return nil, err
			}
		}
	}
}
