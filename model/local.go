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
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/sashabaranov/go-openai"
	"github.com/the-open-agent/openagent/i18n"
)

type LocalModelProvider struct {
	typ                          string
	subType                      string
	deploymentName               string
	secretKey                    string
	temperature                  float32
	topP                         float32
	frequencyPenalty             float32
	presencePenalty              float32
	providerUrl                  string
	apiVersion                   string
	compatibleProvider           string
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewLocalModelProvider(typ string, subType string, secretKey string, temperature float32, topP float32, frequencyPenalty float32, presencePenalty float32, providerUrl string, compatibleProvider string, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, Currency string) (*LocalModelProvider, error) {
	p := &LocalModelProvider{
		typ:                          typ,
		subType:                      subType,
		secretKey:                    secretKey,
		temperature:                  temperature,
		topP:                         topP,
		frequencyPenalty:             frequencyPenalty,
		presencePenalty:              presencePenalty,
		providerUrl:                  providerUrl,
		compatibleProvider:           compatibleProvider,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     Currency,
	}
	return p, nil
}

func getLocalClientFromUrl(authToken string, url string) *openai.Client {
	config := openai.DefaultConfig(authToken)
	config.BaseURL = url

	transport := &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	httpClient := http.Client{Transport: transport}
	config.HTTPClient = &httpClient

	c := openai.NewClientWithConfig(config)
	return c
}

func (p *LocalModelProvider) GetPricing() string {
	return getOpenAIModelPrice()
}

func (p *LocalModelProvider) CalculatePrice(modelResult *ModelResult, lang string) error {
	// local custom model:
	if p.subType == "custom-model" {
		inputPrice := getPrice(modelResult.PromptTokenCount, p.inputPricePerThousandTokens)
		outputPrice := getPrice(modelResult.ResponseTokenCount, p.outputPricePerThousandTokens)
		modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
		modelResult.Currency = p.currency
		return nil
	}
	return CalculateOpenAIModelPrice(p.subType, modelResult, lang)
}

func flushDataAzure(data string, writer io.Writer, lang string) error {
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}
	for _, runeValue := range data {
		char := string(runeValue)
		_, err := fmt.Fprintf(writer, "event: message\ndata: %s\n\n", char)
		if err != nil {
			return err
		}

		flusher.Flush()

		delta := 0
		if !unicode.In(runeValue, unicode.Latin) {
			delta = 50
		}

		var delay int
		if char == "," || char == "，" {
			delay = 20 + rand.Intn(50) + delta
		} else if char == "." || char == "。" || char == "!" || char == "！" || char == "?" || char == "？" {
			delay = 50 + rand.Intn(50) + delta
		} else if char == " " || char == "　" || char == "(" || char == "（" || char == ")" || char == "）" {
			delay = 10 + rand.Intn(50) + delta
		} else {
			delay = rand.Intn(1 + delta*2/5)
		}

		if unicode.In(runeValue, unicode.Latin) {
			delay -= 20
		}

		if delay > 0 {
			time.Sleep(time.Duration(delay) * time.Millisecond)
		}
	}
	return nil
}

func flushDataOpenai(data string, writer io.Writer, lang string) error {
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}
	if _, err := fmt.Fprintf(writer, "event: message\ndata: %s\n\n", data); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}

func flushDataThink(data string, eventType string, writer io.Writer, lang string) error {
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}
	if _, err := fmt.Fprintf(writer, "event: %s\ndata: %s\n\n", eventType, data); err != nil {
		return err
	}
	flusher.Flush()
	return nil
}

func (p *LocalModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	var client *openai.Client
	var flushData interface{} // Can be either flushData or flushDataThink

	if p.typ == "Local" {
		client = getLocalClientFromUrl(p.secretKey, p.providerUrl)
		flushData = flushDataThink
	} else if p.typ == "Azure" {
		client = getAzureClientFromToken(p.deploymentName, p.secretKey, p.providerUrl, p.apiVersion)
		flushData = flushDataAzure
	} else if p.typ == "GitHub" {
		client = getGitHubClientFromToken(p.secretKey, p.providerUrl)
		flushData = flushDataOpenai
	} else if p.typ == "Custom" {
		client = getLocalClientFromUrl(p.secretKey, p.providerUrl)
		flushData = flushDataOpenai
	} else if p.typ == "Custom-think" {
		client = getLocalClientFromUrl(p.secretKey, p.providerUrl)
		flushData = flushDataThink
	}

	ctx := context.Background()
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	model := p.subType
	if model == "custom-model" && p.compatibleProvider != "" {
		model = p.compatibleProvider
	} else if model == "custom-model" && p.compatibleProvider == "" {
		model = "gpt-3.5-turbo"
	}

	temperature := p.temperature
	topP := p.topP
	frequencyPenalty := p.frequencyPenalty
	presencePenalty := p.presencePenalty

	maxTokens := getContextLength(model)

	modelResult := &ModelResult{}
	if getOpenAiModelType(p.subType) == "Chat" {
		rawMessages, err := OpenaiGenerateMessages(prompt, question, history, knowledgeMessages, model, maxTokens, lang)
		if err != nil {
			return nil, err
		}
		if toolSession != nil && toolSession.ToolMessages != nil && toolSession.ToolMessages.Messages != nil {
			rawMessages = append(rawMessages, toolSession.ToolMessages.Messages...)
		}

		var messages []openai.ChatCompletionMessage
		if IsVisionModel(p.subType) {
			messages, err = OpenaiRawMessagesToGptVisionMessages(rawMessages)
			if err != nil {
				return nil, err
			}
		} else {
			messages = OpenaiRawMessagesToMessages(rawMessages)
		}

		// https://github.com/sashabaranov/go-openai/pull/223#issuecomment-1494372875
		promptTokenCount, err := OpenaiNumTokensFromMessages(messages, model)
		if err != nil {
			return nil, err
		}

		modelResult.PromptTokenCount = promptTokenCount
		modelResult.TotalTokenCount = modelResult.PromptTokenCount + modelResult.ResponseTokenCount
		err = p.CalculatePrice(modelResult, lang)
		if err != nil {
			return nil, err
		}

		if strings.HasPrefix(question, "$OpenAgentDryRun$") {
			return modelResult, nil

			//if GetOpenAiMaxTokens(p.subType) > modelResult.TotalTokenCount {
			//	return modelResult, nil
			//} else {
			//	return nil, fmt.Errorf(i18n.Translate(lang, "model:exceed max tokens"))
			//}
		}

		req := ChatCompletionRequest(model, messages, temperature, topP, frequencyPenalty, presencePenalty)
		if toolSession != nil && toolSession.McpToolSet != nil {
			tools, err := reverseToolsToOpenAi(toolSession.McpToolSet.Tools)
			if err != nil {
				return nil, err
			}
			req.Tools = tools
			req.ToolChoice = "auto"
		}

		respStream, err := client.CreateChatCompletionStream(
			ctx,
			req,
		)
		if err != nil {
			return nil, err
		}
		defer respStream.Close()

		isLeadingReturn := true
		var (
			answerData       strings.Builder
			toolCalls        []openai.ToolCall
			toolCallsMap     map[int]int
			reasoningContent strings.Builder
		)

		for {
			completion, streamErr := respStream.Recv()
			if streamErr != nil {
				if streamErr == io.EOF {
					break
				}
				return nil, streamErr
			}

			if len(completion.Choices) == 0 {
				continue
			}
			if completion.Choices[0].Delta.ToolCalls != nil {
				for _, toolCall := range completion.Choices[0].Delta.ToolCalls {
					toolCalls, toolCallsMap = handleToolCallsParameters(toolCall, toolCalls, toolCallsMap)
				}
			}

			// Handle both regular content and reasoning content
			if p.typ == "Custom-think" || p.typ == "Local" {
				// For Custom-think type, we'll handle both reasoning and regular content
				flushThink := flushData.(func(string, string, io.Writer, string) error)

				// Check if we have reasoning content (think_content)
				if completion.Choices[0].Delta.ReasoningContent != "" {
					reasoningData := completion.Choices[0].Delta.ReasoningContent
					reasoningContent.WriteString(reasoningData)
					err = flushThink(reasoningData, "reason", writer, lang)
					if err != nil {
						return nil, err
					}
				}

				// Handle regular content
				if completion.Choices[0].Delta.Content != "" {
					data := completion.Choices[0].Delta.Content
					if isLeadingReturn && len(data) != 0 {
						if strings.Count(data, "\n") == len(data) {
							continue
						} else {
							isLeadingReturn = false
						}
					}

					err = flushThink(data, "message", writer, lang)
					if err != nil {
						return nil, err
					}

					answerData.WriteString(data)
				}
			} else {
				// For all other provider types, use the standard flush function
				flushStandard := flushData.(func(string, io.Writer, string) error)

				data := completion.Choices[0].Delta.Content
				if isLeadingReturn && len(data) != 0 {
					if strings.Count(data, "\n") == len(data) {
						continue
					} else {
						isLeadingReturn = false
					}
				}

				err = flushStandard(data, writer, lang)
				if err != nil {
					return nil, err
				}

				answerData.WriteString(data)
			}
		}

		if toolSession != nil && toolSession.ToolMessages != nil {
			toolSession.ToolMessages.ToolCalls = toolCalls
			toolSession.ToolMessages.ReasoningContent = reasoningContent.String()
		}

		// https://github.com/sashabaranov/go-openai/pull/223#issuecomment-1494372875
		responseTokenCount, err := GetTokenSize(model, answerData.String())
		if err != nil {
			return nil, err
		}

		modelResult.ResponseTokenCount += responseTokenCount
		modelResult.TotalTokenCount = modelResult.PromptTokenCount + modelResult.ResponseTokenCount
		err = p.CalculatePrice(modelResult, lang)
		if err != nil {
			return nil, err
		}
		return modelResult, nil
	} else if getOpenAiModelType(p.subType) == "imagesGenerations" {
		if strings.HasPrefix(question, "$OpenAgentDryRun$") {
			return modelResult, nil
		}
		reqUrl := openai.ImageRequest{
			Prompt:         question,
			Model:          openai.CreateImageModelDallE3,
			Size:           openai.CreateImageSize1024x1024,
			ResponseFormat: openai.CreateImageResponseFormatURL,
			N:              1,
		}

		respUrl, err := client.CreateImage(ctx, reqUrl)
		if err != nil {
			return nil, err
		}

		url := fmt.Sprintf("<img src=\"%s\" width=\"100%%\" height=\"auto\">", respUrl.Data[0].URL)
		fmt.Fprint(writer, url)
		flusher.Flush()

		modelResult.ImageCount = 1
		modelResult.TotalTokenCount = modelResult.ImageCount
		err = p.CalculatePrice(modelResult, lang)
		if err != nil {
			return nil, err
		}
		return modelResult, nil
	} else if getOpenAiModelType(p.subType) == "Completion" {
		respStream, err := client.CreateCompletionStream(
			ctx,
			openai.CompletionRequest{
				Model:            model,
				Prompt:           question,
				Stream:           true,
				Temperature:      temperature,
				TopP:             topP,
				FrequencyPenalty: frequencyPenalty,
				PresencePenalty:  presencePenalty,
			},
		)
		if err != nil {
			return nil, err
		}
		defer respStream.Close()

		isLeadingReturn := true
		var response strings.Builder
		for {
			completion, streamErr := respStream.Recv()
			if streamErr != nil {
				if streamErr == io.EOF {
					break
				}
				return nil, streamErr
			}

			data := completion.Choices[0].Text
			if isLeadingReturn && len(data) != 0 {
				if strings.Count(data, "\n") == len(data) {
					continue
				} else {
					isLeadingReturn = false
				}
			}

			// Here we also need to handle the different flush functions
			if p.typ == "Custom-think" {
				flushThink := flushData.(func(string, string, io.Writer, string) error)
				err = flushThink(data, "message", writer, lang)
			} else {
				flushStandard := flushData.(func(string, io.Writer, string) error)
				err = flushStandard(data, writer, lang)
			}

			if err != nil {
				return nil, err
			}

			_, err = response.WriteString(data)
			if err != nil {
				return nil, err
			}
		}

		modelResult, err = getDefaultModelResult(model, question, response.String())
		return modelResult, nil
	} else {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:QueryText() error: unknown model type: %s"), p.subType)
	}
}
