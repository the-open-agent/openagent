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
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/openai/openai-go/v2/packages/param"
	"github.com/openai/openai-go/v2/responses"
	"github.com/openai/openai-go/v2/shared"
	"github.com/pkoukk/tiktoken-go"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/proxy"
)

type OpenAiModelProvider struct {
	subType          string
	secretKey        string
	temperature      float32
	topP             float32
	frequencyPenalty float32
	presencePenalty  float32
}

func NewOpenAiModelProvider(subType string, secretKey string, temperature float32, topP float32, frequencyPenalty float32, presencePenalty float32) (*OpenAiModelProvider, error) {
	p := &OpenAiModelProvider{
		subType:          subType,
		secretKey:        secretKey,
		temperature:      temperature,
		topP:             topP,
		frequencyPenalty: frequencyPenalty,
		presencePenalty:  presencePenalty,
	}
	return p, nil
}

func CalculateOpenAIModelPrice(model string, modelResult *ModelResult, lang string) error {
	var inputPricePerThousandTokens, outputPricePerThousandTokens float64
	switch {
	// gpt 3.5 turbo model Support:
	case strings.Contains(model, "gpt-3.5"):
		inputPricePerThousandTokens = 0.0005
		outputPricePerThousandTokens = 0.0015
		modelResult.Currency = "USD"

	// gpt 4.1 model
	case strings.Contains(model, "gpt-4.1"):
		if strings.Contains(model, "4.1-mini") {
			inputPricePerThousandTokens = 0.0004
			outputPricePerThousandTokens = 0.0016
		} else if strings.Contains(model, "4.1-nano") {
			inputPricePerThousandTokens = 0.0001
			outputPricePerThousandTokens = 0.0004
		} else {
			inputPricePerThousandTokens = 0.002
			outputPricePerThousandTokens = 0.008
		}
		modelResult.Currency = "USD"

	// gpt 4.0 model
	case strings.Contains(model, "gpt-4"):
		if strings.Contains(model, "turbo") {
			inputPricePerThousandTokens = 0.01
			outputPricePerThousandTokens = 0.03
		} else if strings.Contains(model, "4o-mini") {
			inputPricePerThousandTokens = 0.000075
			outputPricePerThousandTokens = 0.0003
		} else if strings.Contains(model, "4o") {
			inputPricePerThousandTokens = 0.0025
			outputPricePerThousandTokens = 0.0075
		} else {
			inputPricePerThousandTokens = 0.03
			outputPricePerThousandTokens = 0.06
		}
		modelResult.Currency = "USD"

	// o1 model
	case strings.Contains(model, "o1"):
		if strings.Contains(model, "pro") {
			inputPricePerThousandTokens = 0.15
			outputPricePerThousandTokens = 0.6
		} else {
			inputPricePerThousandTokens = 0.015
			outputPricePerThousandTokens = 0.060
		}
		modelResult.Currency = "USD"

	// o3 model
	case strings.Contains(model, "o3"):
		if strings.Contains(model, "mini") {
			inputPricePerThousandTokens = 0.0011
			outputPricePerThousandTokens = 0.0044
		} else {
			inputPricePerThousandTokens = 0.002
			outputPricePerThousandTokens = 0.008
		}
		modelResult.Currency = "USD"

	// o4 model
	case strings.Contains(model, "o4"):
		if strings.Contains(model, "o4-mini") {
			inputPricePerThousandTokens = 0.0011
			outputPricePerThousandTokens = 0.0044
		} else {
			inputPricePerThousandTokens = 0.0011
			outputPricePerThousandTokens = 0.0044
		}
		modelResult.Currency = "USD"

	// gpt 5.2 model (includes gpt-5.2-chat which uses same pricing)
	case strings.Contains(model, "gpt-5.2"):
		if strings.Contains(model, "5.2-mini") {
			inputPricePerThousandTokens = 0.00025
			outputPricePerThousandTokens = 0.002
		} else if strings.Contains(model, "5.2-nano") {
			inputPricePerThousandTokens = 0.00005
			outputPricePerThousandTokens = 0.0004
		} else {
			inputPricePerThousandTokens = 0.00125
			outputPricePerThousandTokens = 0.01
		}
		modelResult.Currency = "USD"

	// gpt 5.1 model
	case strings.Contains(model, "gpt-5.1"):
		if strings.Contains(model, "5.1-mini") {
			inputPricePerThousandTokens = 0.00025
			outputPricePerThousandTokens = 0.002
		} else if strings.Contains(model, "5.1-nano") {
			inputPricePerThousandTokens = 0.00005
			outputPricePerThousandTokens = 0.0004
		} else {
			inputPricePerThousandTokens = 0.00125
			outputPricePerThousandTokens = 0.01
		}
		modelResult.Currency = "USD"

	// gpt 5.0 model
	case strings.Contains(model, "gpt-5"):
		if strings.Contains(model, "5-mini") {
			inputPricePerThousandTokens = 0.00025
			outputPricePerThousandTokens = 0.002
		} else if strings.Contains(model, "5-nano") {
			inputPricePerThousandTokens = 0.00005
			outputPricePerThousandTokens = 0.0004
		} else {
			inputPricePerThousandTokens = 0.00125
			outputPricePerThousandTokens = 0.01
		}
		modelResult.Currency = "USD"

	// gpt 4.5 model
	case strings.Contains(model, "gpt-4.5"):
		if strings.Contains(model, "4.5-mini") {
			inputPricePerThousandTokens = 0.0004
			outputPricePerThousandTokens = 0.0016
		} else if strings.Contains(model, "4.5-nano") {
			inputPricePerThousandTokens = 0.0001
			outputPricePerThousandTokens = 0.0004
		} else {
			inputPricePerThousandTokens = 0.002
			outputPricePerThousandTokens = 0.008
		}
		modelResult.Currency = "USD"

	// deep-research model
	case strings.Contains(model, "deep-research"):
		inputPricePerThousandTokens = 0.002
		outputPricePerThousandTokens = 0.008
		modelResult.Currency = "USD"

	// gpt-image-1 model
	case strings.Contains(model, "gpt-image-1"):
		modelResult.TotalPrice = float64(modelResult.ImageCount) * 0.08
		modelResult.Currency = "USD"
		return nil

	// dall-e model
	case strings.Contains(model, "dall-e-3"):
		modelResult.TotalPrice = float64(modelResult.ImageCount) * 0.08
		modelResult.Currency = "USD"
		return nil
	default:
		// inputPricePerThousandTokens = 0
		// outputPricePerThousandTokens = 0
		return fmt.Errorf(i18n.Translate(lang, "embedding:calculatePrice() error: unknown model type: %s"), model)
	}

	inputPrice := getPrice(modelResult.PromptTokenCount, inputPricePerThousandTokens)
	outputPrice := getPrice(modelResult.ResponseTokenCount, outputPricePerThousandTokens)
	modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
	return nil
}

func getOpenAIModelPrice() string {
	return `URL:
https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/

Language models:

| Models                | Context | Input (Per 1,000 tokens) | Output (Per 1,000 tokens) |
|-----------------------|---------|--------------------------|--------------------------|
| GPT-3.5-Turbo         | 16K     | $0.0005                  | $0.0015                  |
| GPT-4                 | 8K      | $0.03                    | $0.06                    |
| GPT-4                 | 32K     | $0.06                    | $0.12                    |
| GPT-4-Turbo           | 128K    | $0.01                    | $0.03                    |
| GPT-4o                | 128K    | $0.0025                  | $0.0075                  |
| GPT-4o-mini           | 128K    | $0.000075                | $0.0003                  |
| GPT-4.1               | 100K    | $0.002                   | $0.008                   |
| GPT-4.1-mini          | 100K    | $0.0004	                 | $0.0016                  |
| GPT-4.1-nano          | 100K    | $0.0001                  | $0.0004                  |
| GPT-4.5               | 100K    | $0.002                   | $0.008                   |
| GPT-4.5-mini          | 100K    | $0.0004                  | $0.0016                  |
| GPT-4.5-nano          | 100K    | $0.0001                  | $0.0004                  |
| o1                    | 200K    | $0.015                   | $0.060                   |
| o1-pro                | 200K    | $0.15                    | $0.6                     |
| o3                    | 200K    | $0.002                   | $0.008                   |
| o3-mini               | 200K    | $0.0011                  | $0.0044                  |
| o4-mini               | 200K    | $0.0011                  | $0.0044                  |
| GPT-5                 | 400K    | $0.00125                 | $0.01                    |
| GPT-5-mini            | 400K    | $0.00025                 | $0.002                   |
| GPT-5-nano            | 400K    | $0.00005                 | $0.0004                  |
| GPT-5.1               | 400K    | $0.00125                 | $0.01                    |
| GPT-5.1-mini          | 400K    | $0.00025                 | $0.002                   |
| GPT-5.1-nano          | 400K    | $0.00005                 | $0.0004                  |
| GPT-5.2               | 400K    | $0.00125                 | $0.01                    |
| GPT-5.2-mini          | 400K    | $0.00025                 | $0.002                   |
| GPT-5.2-nano          | 400K    | $0.00005                 | $0.0004                  |
| GPT-5.2-chat          | 400K    | $0.00125                 | $0.01                    |
| GPT-5-chat-latest     | 400K    | $0.00125                 | $0.01                    |
| Deep-Research         | 200K    | $0.002                   | $0.008                   |
Image models:

| Models       | Quality | Resolution               | Price (per image) |
|--------------|---------|--------------------------|------------------|
| Dall-E-3     | Standard| 1024 * 1024              | N/A              |
|              | Standard| 1024 * 1792, 1792 * 1024 | $0.08            |
| Dall-E-3     | HD      | 1024 * 1024              | N/A              |
|              | HD      | 1024 * 1792, 1792 * 1024 | N/A              |
| Dall-E-2     | Standard| 1024 * 1024              | N/A              |
| GPT-Image-1  | Standard| 1024 * 1024              | $0.08            |
`
}

func (p *OpenAiModelProvider) GetPricing() string {
	return getOpenAIModelPrice()
}

func GetOpenAiClientFromToken(authToken string) openai.Client {
	httpClient := proxy.ProxyHttpClient
	c := openai.NewClient(option.WithHTTPClient(httpClient), option.WithAPIKey(authToken))
	return c
}

func (p *OpenAiModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, agentInfo *AgentInfo, lang string) (*ModelResult, error) {
	var client openai.Client
	var flushData interface{}

	client = GetOpenAiClientFromToken(p.secretKey)
	flushData = flushDataThink

	ctx := context.Background()
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	model := p.subType
	temperature := p.temperature
	topP := p.topP
	frequencyPenalty := p.frequencyPenalty
	presencePenalty := p.presencePenalty

	maxTokens := getContextLength(model)

	modelResult := &ModelResult{}
	if getOpenAiModelType(model) == "Chat" {
		rawMessages, err := OpenaiGenerateMessages(prompt, question, history, knowledgeMessages, model, maxTokens, lang)
		if err != nil {
			return nil, err
		}
		if agentInfo != nil && agentInfo.AgentMessages != nil && agentInfo.AgentMessages.Messages != nil {
			rawMessages = append(rawMessages, agentInfo.AgentMessages.Messages...)
		}

		var messages responses.ResponseInputParam
		var toolCalls []responses.ResponseFunctionToolCall

		if IsVisionModel(model) {
			messages, err = openaiRawMessagesToGptVisionMessages(rawMessages)
			if err != nil {
				return nil, err
			}
		} else {
			messages = openaiRawMessagesToMessages(rawMessages)
		}

		if strings.HasPrefix(question, "$OpenAgentDryRun$") {
			promptTokenCount, err := openaiNumTokensFromMessages(messages, model)
			if err != nil {
				return nil, err
			}

			modelResult.PromptTokenCount = promptTokenCount
			modelResult.TotalTokenCount = modelResult.PromptTokenCount + modelResult.ResponseTokenCount
			err = CalculateOpenAIModelPrice(model, modelResult, lang)
			if err != nil {
				return nil, err
			}

			if getContextLength(model) > modelResult.TotalTokenCount {
				return modelResult, nil
			} else {
				return nil, fmt.Errorf(i18n.Translate(lang, "model:exceed max tokens"))
			}
		}

		req := responses.ResponseNewParams{
			Instructions: param.NewOpt[string](prompt),
			Input:        responses.ResponseNewParamsInputUnion{OfInputItemList: messages},
			Model:        model,
			Temperature:  param.NewOpt[float64](float64(temperature)),
			TopP:         param.NewOpt[float64](float64(topP)),
			Reasoning:    shared.ReasoningParam{Summary: "auto"},
		}
		if agentInfo != nil && agentInfo.AgentClients != nil {
			agentTools, err := reverseMcpToolsToOpenAi(agentInfo.AgentClients.Tools)
			if err != nil {
				return nil, err
			}
			if agentInfo.AgentClients.WebSearchEnabled {
				agentTools = append(agentTools, responses.ToolParamOfWebSearchPreview(responses.WebSearchToolTypeWebSearchPreview))
			}

			req.Tools = agentTools
			req.ToolChoice = responses.ResponseNewParamsToolChoiceUnion{
				OfToolChoiceMode: param.NewOpt(responses.ToolChoiceOptionsAuto),
			}
		}

		respStream := client.Responses.NewStreaming(ctx, req)
		defer respStream.Close()

		isLeadingReturn := true
		for respStream.Next() {
			flushThink := flushData.(func(string, string, io.Writer, string) error)
			response := respStream.Current()
			switch variant := response.AsAny().(type) {
			case responses.ResponseReasoningSummaryTextDeltaEvent:
				data := variant.Delta
				err = flushThink(data, "reason", writer, lang)
				if err != nil {
					return nil, err
				}
			case responses.ResponseTextDeltaEvent:
				data := variant.Delta
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
			case responses.ResponseOutputItemDoneEvent:
				switch v := variant.Item.AsAny().(type) {
				case responses.ResponseFunctionToolCall:
					toolCalls = append(toolCalls, v)
				case responses.ResponseOutputMessage:
					if v.Status == "completed" {
						for _, contentItem := range v.Content {
							if contentItem.Type != "output_text" || len(contentItem.Annotations) == 0 {
								continue
							}
							var searchResults []SearchResult
							for idx, annotation := range contentItem.Annotations {
								searchResults = append(searchResults, SearchResult{
									Index: idx + 1,
									URL:   annotation.URL,
									Title: annotation.Title,
								})
							}
							searchResultsJSON, _ := json.Marshal(searchResults)
							flushDataThink(string(searchResultsJSON), "search", writer, lang)
						}
					}
				}
			case responses.ResponseCompletedEvent:
				modelResult.ResponseTokenCount = int(variant.Response.Usage.OutputTokens)
				modelResult.PromptTokenCount = int(variant.Response.Usage.InputTokens)
				modelResult.TotalTokenCount = int(variant.Response.Usage.TotalTokens)
				break
			}
		}
		if respStream.Err() != nil {
			return nil, respStream.Err()
		}

		if agentInfo != nil && agentInfo.AgentMessages != nil {
			agentInfo.AgentMessages.ToolCalls = toolCalls
		}

		err = CalculateOpenAIModelPrice(model, modelResult, lang)
		if err != nil {
			return nil, err
		}
		return modelResult, nil
	} else if getOpenAiModelType(model) == "imagesGenerations" {
		if strings.HasPrefix(question, "$OpenAgentDryRun$") {
			return modelResult, nil
		}
		quality := getGenerateImageQuality(model)
		reqGen := openai.ImageGenerateParams{
			Prompt:  question,
			Model:   model,
			Size:    openai.ImageGenerateParamsSize1024x1024,
			Quality: quality,
			N:       param.NewOpt[int64](1),
		}
		// response_format is only valid for dall-e-2 / dall-e-3. gpt-image models reject it
		// and return base64-encoded image data by default.
		if strings.HasPrefix(model, "dall-e") {
			reqGen.ResponseFormat = openai.ImageGenerateParamsResponseFormatURL
		}

		respUrl, err := client.Images.Generate(ctx, reqGen)
		if err != nil {
			return nil, err
		}

		imgSrc, err := openaiImageHTMLSrc(respUrl)
		if err != nil {
			return nil, err
		}
		url := fmt.Sprintf("<img src=\"%s\" width=\"100%%\" height=\"auto\">", imgSrc)
		fmt.Fprint(writer, url)
		flusher.Flush()

		modelResult.ImageCount = 1
		modelResult.TotalTokenCount = modelResult.ImageCount
		err = CalculateOpenAIModelPrice(model, modelResult, lang)
		if err != nil {
			return nil, err
		}

		return modelResult, nil
	} else if getOpenAiModelType(model) == "Completion" {
		respStream := client.Completions.NewStreaming(ctx, openai.CompletionNewParams{
			Prompt: openai.CompletionNewParamsPromptUnion{
				OfString: param.Opt[string]{Value: question},
			},
			Model:            openai.CompletionNewParamsModel(model),
			Temperature:      param.NewOpt[float64](float64(temperature)),
			TopP:             param.NewOpt[float64](float64(topP)),
			FrequencyPenalty: param.NewOpt[float64](float64(frequencyPenalty)),
			PresencePenalty:  param.NewOpt[float64](float64(presencePenalty)),
		})
		defer respStream.Close()

		isLeadingReturn := true
		var response strings.Builder

		for respStream.Next() {
			completion := respStream.Current()

			data := completion.Choices[0].Text
			if isLeadingReturn && len(data) != 0 {
				if strings.Count(data, "\n") == len(data) {
					continue
				} else {
					isLeadingReturn = false
				}
			}

			flushStandard := flushData.(func(string, io.Writer, string) error)
			err := flushStandard(data, writer, lang)
			if err != nil {
				return nil, err
			}

			_, err = response.WriteString(data)
			if err != nil {
				return nil, err
			}

			if completion.Choices[0].FinishReason != "" {
				if completion.Choices[0].FinishReason == openai.CompletionChoiceFinishReasonStop {
					modelResult.PromptTokenCount = int(completion.Usage.PromptTokens)
					modelResult.ResponseTokenCount = int(completion.Usage.CompletionTokens)
					modelResult.TotalTokenCount = int(completion.Usage.TotalTokens)
					modelResult.Currency = "USD"
				} else {
					modelResult, err = getDefaultModelResult(model, question, response.String())
					if err != nil {
						return nil, err
					}
				}
				break
			}
		}

		if respStream.Err() != nil {
			return nil, respStream.Err()
		}

		return modelResult, nil
	} else {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:QueryText() error: unknown model type: %s"), model)
	}
}

func openaiImageHTMLSrc(resp *openai.ImagesResponse) (string, error) {
	if resp == nil || len(resp.Data) == 0 {
		return "", fmt.Errorf("empty image generation response")
	}
	img := resp.Data[0]
	if img.URL != "" {
		return img.URL, nil
	}
	if img.B64JSON == "" {
		return "", fmt.Errorf("no image URL or base64 payload in response")
	}
	mime := "image/png"
	switch resp.OutputFormat {
	case openai.ImagesResponseOutputFormatWebP:
		mime = "image/webp"
	case openai.ImagesResponseOutputFormatJPEG:
		mime = "image/jpeg"
	}
	return fmt.Sprintf("data:%s;base64,%s", mime, img.B64JSON), nil
}

func getGenerateImageQuality(model string) openai.ImageGenerateParamsQuality {
	if strings.HasPrefix(model, "dall-e-3") {
		return openai.ImageGenerateParamsQualityHD
	} else if strings.HasPrefix(model, "dall-e-2") {
		return openai.ImageGenerateParamsQualityStandard
	} else if strings.HasPrefix(model, "gpt-image-1") {
		return openai.ImageGenerateParamsQualityHigh
	}
	return openai.ImageGenerateParamsQualityAuto
}

func openaiRawMessagesToMessages(messages []*RawMessage) responses.ResponseInputParam {
	var res responses.ResponseInputParam
	for _, message := range messages {
		if message.Text == "" {
			message.Text = " "
		}
		var role responses.EasyInputMessageRole
		if message.Author == "AI" {
			role = responses.EasyInputMessageRoleAssistant
			if message.ToolCall.ID != "" {
				item := responses.ResponseInputItemUnionParam{
					OfFunctionCall: &responses.ResponseFunctionToolCallParam{
						Arguments: message.ToolCall.Function.Arguments,
						Name:      message.ToolCall.Function.Name,
						CallID:    message.ToolCall.ID,
					},
				}
				res = append(res, item)
			} else {
				item := responses.ResponseInputItemUnionParam{
					OfOutputMessage: &responses.ResponseOutputMessageParam{
						Content: []responses.ResponseOutputMessageContentUnionParam{
							{
								OfOutputText: &responses.ResponseOutputTextParam{
									Text: message.Text,
								},
							},
						},
					},
				}
				res = append(res, item)
			}
			continue
		} else if message.Author == "System" {
			role = responses.EasyInputMessageRoleSystem
		} else if message.Author == "Tool" {
			item := responses.ResponseInputItemUnionParam{
				OfFunctionCallOutput: &responses.ResponseInputItemFunctionCallOutputParam{
					CallID: message.ToolCallID,
					Output: message.Text,
				},
			}
			res = append(res, item)
			continue
		} else {
			role = responses.EasyInputMessageRoleUser
		}

		item := responses.ResponseInputItemUnionParam{
			OfMessage: &responses.EasyInputMessageParam{
				Content: responses.EasyInputMessageContentUnionParam{
					OfString: param.NewOpt[string](message.Text),
				},
				Role: role,
			},
		}
		res = append(res, item)
	}
	return res
}

func openaiRawMessagesToGptVisionMessages(messages []*RawMessage) (responses.ResponseInputParam, error) {
	var res responses.ResponseInputParam
	for _, message := range messages {
		var role responses.EasyInputMessageRole
		if message.Author == "AI" {
			role = responses.EasyInputMessageRoleAssistant
			if message.ToolCall.ID != "" {
				item := responses.ResponseInputItemUnionParam{
					OfFunctionCall: &responses.ResponseFunctionToolCallParam{
						Arguments: message.ToolCall.Function.Arguments,
						Name:      message.ToolCall.Function.Name,
						CallID:    message.ToolCall.ID,
					},
				}
				res = append(res, item)
			} else {
				item := responses.ResponseInputItemUnionParam{
					OfOutputMessage: &responses.ResponseOutputMessageParam{
						Content: []responses.ResponseOutputMessageContentUnionParam{
							{
								OfOutputText: &responses.ResponseOutputTextParam{
									Text: message.Text,
								},
							},
						},
					},
				}
				res = append(res, item)
			}
			continue
		} else if message.Author == "System" {
			role = responses.EasyInputMessageRoleSystem
		} else if message.Author == "Tool" {
			item := responses.ResponseInputItemUnionParam{
				OfFunctionCallOutput: &responses.ResponseInputItemFunctionCallOutputParam{
					CallID: message.ToolCallID,
					Output: message.Text,
				},
			}
			res = append(res, item)
			continue
		} else {
			role = responses.EasyInputMessageRoleUser
		}

		urls, messageText := extractImagesURL(message.Text)

		var itemContentList responses.ResponseInputMessageContentListParam
		if len(messageText) > 0 {
			if messageText == "" {
				messageText = " "
			}
			itemContentList = append(itemContentList, responses.ResponseInputContentUnionParam{
				OfInputText: &responses.ResponseInputTextParam{
					Text: messageText,
				},
			})
		}
		for _, url := range urls {
			imageText, err := getImageRefinedText(url)
			if err != nil {
				return res, err
			}
			itemContentList = append(itemContentList, responses.ResponseInputContentUnionParam{
				OfInputImage: &responses.ResponseInputImageParam{
					ImageURL: param.NewOpt[string](imageText),
				},
			})
		}

		content := responses.EasyInputMessageContentUnionParam{
			OfInputItemContentList: itemContentList,
		}

		item := responses.ResponseInputItemUnionParam{
			OfMessage: &responses.EasyInputMessageParam{
				Content: content,
				Role:    role,
			},
		}
		res = append(res, item)
	}
	return res, nil
}

func openaiNumTokensFromMessages(messages responses.ResponseInputParam, model string) (int, error) {
	modelToUse := getCompatibleModel(model)
	// Get model-specific token counts
	tokensPerMessage, _ := getModelTokenCounts(modelToUse)

	// Get tiktoken encoding using the compatibility layer
	tkm, err := tiktoken.EncodingForModel(modelToUse)
	if err != nil {
		return 0, err
	}

	numTokens := 0
	for _, message := range messages {
		// Calculate tokens for the message content
		var content string
		var role string
		if message.OfMessage != nil {
			content = message.OfMessage.Content.OfString.String()
			for _, multiContentPart := range message.OfMessage.Content.OfInputItemContentList {
				if multiContentPart.OfInputText != nil {
					content += multiContentPart.OfInputText.Text
				}
			}
			role = string(message.OfMessage.Role)
		} else if message.OfOutputMessage != nil {
			for _, multiContentPart := range message.OfOutputMessage.Content {
				if multiContentPart.OfOutputText != nil {
					content += multiContentPart.OfOutputText.Text
				}
			}
			role = string(message.OfOutputMessage.Role)
		}

		numTokens += tokensPerMessage
		numTokens += len(tkm.Encode(content, nil, nil))
		numTokens += len(tkm.Encode(role, nil, nil))
	}

	numTokens += 3 // every reply is primed with <|start|>assistant<|message|>
	return numTokens, nil
}

func reverseMcpToolsToOpenAi(tools []*protocol.Tool) ([]responses.ToolUnionParam, error) {
	var openaiTools []responses.ToolUnionParam
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
		openaiTools = append(openaiTools, responses.ToolUnionParam{
			OfFunction: &responses.FunctionToolParam{
				Type:        "function",
				Name:        tool.Name,
				Description: param.NewOpt[string](tool.Description),
				Parameters:  parameters,
			},
		})
	}
	return openaiTools, nil
}
