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
	"fmt"
	"math"
	"regexp"
	"strings"
	"unicode"

	"github.com/pkoukk/tiktoken-go"
	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/i18n"
)

type RawMessage struct {
	Text             string
	Author           string
	TextTokenCount   int
	ReasoningContent string
	ToolCall         openai.ToolCall
	ToolCallID       string
	Images           []ImageAttachment
}

type ImageAttachment struct {
	Data     []byte
	MimeType string
}

type SearchResult struct {
	Icon     string `json:"icon,omitempty"`
	SiteName string `json:"site_name,omitempty"`
	Index    int    `json:"index"`
	Title    string `json:"title"`
	URL      string `json:"url"`
}

func reverseMessages(arr []*RawMessage) []*RawMessage {
	for i, j := 0, len(arr)-1; i < j; i, j = i+1, j-1 {
		arr[i], arr[j] = arr[j], arr[i]
	}

	return arr
}

func getPrice(tokenCount int, pricePerThousandTokens float64) float64 {
	res := (float64(tokenCount) / 1000.0) * pricePerThousandTokens
	res = math.Round(res*1e8) / 1e8
	return res
}

func AddPrices(price1 float64, price2 float64) float64 {
	res := price1 + price2
	res = math.Round(res*1e8) / 1e8
	return res
}

func RefinePrice(price float64) float64 {
	res := math.Round(price*1e2) / 1e2
	return res
}

func getCompatibleModel(model string) string {
	openaiModels := map[string]bool{
		openai.GPT3Dot5Turbo:        true,
		openai.GPT3Dot5Turbo0301:    true,
		openai.GPT3Dot5Turbo0613:    true,
		openai.GPT3Dot5Turbo1106:    true,
		openai.GPT3Dot5Turbo0125:    true,
		openai.GPT3Dot5Turbo16K:     true,
		openai.GPT3Dot5Turbo16K0613: true,
		openai.GPT4:                 true,
		openai.GPT4o:                true,
		openai.GPT4o20240513:        true,
		openai.GPT4oMini:            true,
		openai.GPT4oMini20240718:    true,
		openai.GPT4TurboPreview:     true,
		openai.GPT4VisionPreview:    true,
		openai.GPT4Turbo1106:        true,
		openai.GPT4Turbo0125:        true,
		openai.GPT4Turbo:            true,
		openai.GPT4Turbo20240409:    true,
		openai.GPT40314:             true,
		openai.GPT40613:             true,
		openai.GPT432K:              true,
		openai.GPT432K0314:          true,
		openai.GPT432K0613:          true,
	}

	if openaiModels[model] {
		return model
	}

	// Handle generic model families
	if strings.Contains(model, "gpt-3.5-turbo") {
		return openai.GPT3Dot5Turbo
	} else if strings.Contains(model, "gpt-5") || strings.Contains(model, "gpt-4") || strings.Contains(model, "deep-research") || strings.Contains(model, "o1") || strings.Contains(model, "o3") || strings.Contains(model, "o4") {
		return openai.GPT4
	}

	// Default to GPT-4
	return openai.GPT4
}

func GetTokenSize(model string, prompt string) (int, error) {
	modelToUse := getCompatibleModel(model)
	tkm, err := tiktoken.EncodingForModel(modelToUse)
	if err != nil {
		return 0, err
	}

	token := tkm.Encode(prompt, nil, nil)
	res := len(token)
	return res, nil
}

func getDefaultModelResult(modelSubType string, prompt string, response string) (*ModelResult, error) {
	modelResult := &ModelResult{}

	promptTokenCount, err := GetTokenSize(modelSubType, prompt)
	if err != nil {
		promptTokenCount, err = GetTokenSize("gpt-3.5-turbo", prompt)
	}
	if err != nil {
		return nil, err
	}

	responseTokenCount, err := GetTokenSize(modelSubType, response)
	if err != nil {
		responseTokenCount, err = GetTokenSize("gpt-3.5-turbo", response)
	}
	if err != nil {
		return nil, err
	}

	modelResult.PromptTokenCount = promptTokenCount
	modelResult.ResponseTokenCount = responseTokenCount
	modelResult.TotalTokenCount = promptTokenCount + responseTokenCount
	modelResult.Currency = "USD"
	return modelResult, nil
}

func containsZh(str string) bool {
	for _, r := range str {
		if unicode.Is(unicode.Han, r) {
			return true
		}
	}
	return false
}

func getSystemMessages(prompt string, knowledgeMessages []*RawMessage) []*RawMessage {
	if prompt == "" {
		prompt = "You are an expert in your field and you specialize in using your knowledge to answer or solve people's problems."
	}

	if len(knowledgeMessages) == 0 {
		return []*RawMessage{{Text: prompt, Author: "System"}}
	}

	knowledgeTag := "Knowledge"
	if containsZh(prompt) {
		knowledgeTag = "知识"
	}

	combined := prompt
	hasImageKnowledge := false
	for i, message := range knowledgeMessages {
		combined += fmt.Sprintf("\n\n%s %d: %s", knowledgeTag, i+1, message.Text)
		if strings.Contains(message.Text, "![](") {
			hasImageKnowledge = true
		}
	}

	if hasImageKnowledge {
		if containsZh(prompt) {
			combined += "\n\n若上述知识中包含与问题相关的图片，请在回答中用 Markdown 语法 ![](url) 原样引用对应图片链接。"
		} else {
			combined += "\n\nIf any of the knowledge above contains an image relevant to the question, include the image in your answer using its original markdown link ![](url)."
		}
	}

	return []*RawMessage{{Text: combined, Author: "System"}}
}

func getHistoryMessages(recentMessages []*RawMessage, model string, leftTokens int) ([]*RawMessage, error) {
	var res []*RawMessage

	for _, message := range recentMessages {
		leftTokens -= message.TextTokenCount
		if leftTokens <= 0 {
			break
		}

		res = append(res, message)
	}

	res = reverseMessages(res)
	return res, nil
}

func OpenaiGenerateMessages(prompt string, question string, recentMessages []*RawMessage, knowledgeMessages []*RawMessage, model string, maxTokens int, lang string) ([]*RawMessage, error) {
	queryMessage := &RawMessage{
		Text:   question,
		Author: openai.ChatMessageRoleUser,
	}
	queryMessageSize, err := GetTokenSize(model, queryMessage.Text)
	if err != nil {
		return nil, err
	}

	leftTokens := maxTokens - queryMessageSize
	if leftTokens <= 0 {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:the token count: [%d] exceeds the model: [%s]'s maximum token count: [%d]"), queryMessageSize, model, maxTokens)
	}

	for i, message := range knowledgeMessages {
		leftTokens -= message.TextTokenCount
		if leftTokens <= 0 {
			knowledgeMessages = knowledgeMessages[:i]
			break
		}
	}

	historyMessages, err := getHistoryMessages(recentMessages, model, leftTokens)
	if err != nil {
		return nil, err
	}
	nonImageHistoryMessage := []*RawMessage{}
	for _, message := range historyMessages {
		re := regexp.MustCompile(`<img[^>]*\s+src=["']?([^"'>\s]+)["']?[^>]*>`)
		match := re.FindStringSubmatch(message.Text)
		if match == nil {
			nonImageHistoryMessage = append(nonImageHistoryMessage, message)
		}
	}

	res := getSystemMessages(prompt, knowledgeMessages)
	res = append(res, nonImageHistoryMessage...)
	res = append(res, queryMessage)
	return res, nil
}
