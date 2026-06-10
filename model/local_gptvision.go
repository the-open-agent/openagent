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
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strings"

	"github.com/sashabaranov/go-openai"
)

func extractImagesURL(message string) ([]string, string) {
	message = strings.Replace(message, "&nbsp;", " ", -1)
	br := regexp.MustCompile(`<br\s*/?>`)
	message = br.ReplaceAllString(message, " ")

	imgURL := regexp.MustCompile(`http[s]?://\S+\.(jpg|jpeg|png|gif|webp)`)
	urls := imgURL.FindAllString(message, -1)
	quote := regexp.MustCompile(`\"$`)
	for i, url := range urls {
		urls[i] = quote.ReplaceAllString(url, "")
	}

	message = imgURL.ReplaceAllString(message, "")

	img := regexp.MustCompile(`<img[^>]+>`)
	message = img.ReplaceAllString(message, "")
	return urls, message
}

func supportedImageMimeType(mimeType string) string {
	mimeType = strings.ToLower(strings.TrimSpace(strings.Split(mimeType, ";")[0]))
	switch mimeType {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
		return mimeType
	default:
		return ""
	}
}

func imageMimeTypeFromURL(text string) string {
	parsed, err := url.Parse(text)
	target := text
	if err == nil && parsed.Path != "" {
		target = parsed.Path
	}
	ext := strings.ToLower(path.Ext(target))
	if ext != "" {
		ext = ext[1:]
	}
	switch ext {
	case "jpg", "jpeg":
		return "image/jpeg"
	case "png":
		return "image/png"
	case "gif":
		return "image/gif"
	case "webp":
		return "image/webp"
	default:
		return ""
	}
}

func safeImageURLForError(text string) string {
	parsed, err := url.Parse(text)
	if err != nil || parsed.Host == "" {
		return "<redacted image URL>"
	}
	return parsed.Scheme + "://" + parsed.Host + parsed.Path
}

func getImageRefinedText(text string) (string, error) {
	resp, err := http.Get(text)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	mimeType := supportedImageMimeType(resp.Header.Get("Content-Type"))
	if mimeType == "" {
		mimeType = supportedImageMimeType(http.DetectContentType(data))
	}
	if mimeType == "" {
		mimeType = imageMimeTypeFromURL(text)
	}
	if mimeType == "" {
		return "", fmt.Errorf("unsupported image type for %s", safeImageURLForError(text))
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	res := fmt.Sprintf("data:%s;base64,%s", mimeType, base64Data)
	return res, nil
}

func IsVisionModel(subType string) bool {
	visionModels := []string{
		// GPT-5.4 series (latest)
		"gpt-5.4", "gpt-5.4-pro", "gpt-5.4-mini", "gpt-5.4-nano",
		// GPT-5.3 series
		"gpt-5.3-codex", "gpt-5.3-chat",
		// GPT-5.2 series
		"gpt-5.2", "gpt-5.2-chat", "gpt-5.2-codex",
		// GPT-5.1 series
		"gpt-5.1", "gpt-5.1-chat", "gpt-5.1-codex", "gpt-5.1-codex-mini", "gpt-5.1-codex-max",
		// GPT-5 series
		"gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-codex", "gpt-5-pro",
		// o-series (latest first)
		"o4-mini", "codex-mini", "o3-pro", "o3", "o1-pro", "o1",
		// GPT-4.1 series
		"gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
		// GPT-4.5 / GPT-4o series
		"gpt-4.5", "gpt-4.5-preview", "gpt-4.5-preview-2025-02-27",
		"gpt-4o", "gpt-4o-2024-08-06", "gpt-4o-mini", "gpt-4o-mini-2024-07-18",
		// Specialized
		"computer-use-preview",
		// OpenAI-compatible Qwen vision models
		"qwen3.6-plus", "qwen3.6-flash",
		"qwen3-vl-plus", "qwen3-vl-flash",
		"qwen-vl-max", "qwen-vl-plus",
		"qvq-max", "qvq-plus",
	}

	for _, visionModel := range visionModels {
		if subType == visionModel {
			return true
		}
	}

	return false
}

func ExtractFirstImageDataURL(message string) (string, string, error) {
	urls, messageText := extractImagesURL(message)
	if len(urls) == 0 {
		return "", messageText, nil
	}

	imageText, err := getImageRefinedText(urls[0])
	if err != nil {
		return "", "", err
	}
	return imageText, messageText, nil
}

func OpenaiRawMessagesToGptVisionMessages(messages []*RawMessage) ([]openai.ChatCompletionMessage, error) {
	res := []openai.ChatCompletionMessage{}
	for _, message := range messages {
		var role string
		if message.Author == "AI" {
			role = openai.ChatMessageRoleAssistant
		} else if message.Author == "System" {
			role = openai.ChatMessageRoleSystem
		} else if message.Author == "Tool" {
			role = openai.ChatMessageRoleTool
		} else {
			role = openai.ChatMessageRoleUser
		}

		urls, messageText := extractImagesURL(message.Text)

		item := openai.ChatCompletionMessage{
			Role:             role,
			ReasoningContent: message.ReasoningContent,
		}

		if role == openai.ChatMessageRoleTool {
			item.ToolCallID = message.ToolCallID
			item.Content = message.Text
			res = append(res, item)
			continue
		} else if role == openai.ChatMessageRoleAssistant {
			if message.ToolCall.ID != "" {
				item.ToolCalls = []openai.ToolCall{message.ToolCall}
			} else {
				item.ToolCalls = nil
			}
		}

		if len(messageText) > 0 {
			item.MultiContent = []openai.ChatMessagePart{
				{
					Type: openai.ChatMessagePartTypeText,
					Text: messageText,
				},
			}
		}

		for _, url := range urls {
			imageText, err := getImageRefinedText(url)
			if err != nil {
				return []openai.ChatCompletionMessage{}, err
			}

			item.MultiContent = append(item.MultiContent, openai.ChatMessagePart{
				Type: openai.ChatMessagePartTypeImageURL,
				ImageURL: &openai.ChatMessageImageURL{
					URL:    imageText,
					Detail: openai.ImageURLDetailAuto,
				},
			})
		}

		res = append(res, item)
	}
	return res, nil
}
