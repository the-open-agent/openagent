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
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/proxy"
	"google.golang.org/genai"
)

type GeminiModelProvider struct {
	subType     string
	secretKey   string
	temperature float32
	topP        float32
	topK        int
}

func NewGeminiModelProvider(subType string, secretKey string, temperature float32, topP float32, topK int) (*GeminiModelProvider, error) {
	p := &GeminiModelProvider{
		subType:     subType,
		secretKey:   secretKey,
		temperature: temperature,
		topP:        topP,
		topK:        topK,
	}
	return p, nil
}

func (p *GeminiModelProvider) GetPricing() string {
	return `URL: https://ai.google.dev/gemini-api/docs/pricing
| Model                                          | Input Price (per 1M tokens)              | Output Price (per 1M tokens)              |
|------------------------------------------------|------------------------------------------|-------------------------------------------|
| Gemini 3.1 Pro Preview                         | $2.00 (≤200k), $4.00 (>200k)           | $12.00 (≤200k), $18.00 (>200k)           |
| Gemini 3.1 Flash-Lite Preview                  | $0.25 (text/image/video)                | $1.50                                     |
| Gemini 3.1 Flash Live Preview                  | $0.75 (text), $3.00 (audio/image/video) | $4.50 (text), $12.00 (audio)              |
| Gemini 3.1 Flash Image Preview                 | $0.25 (text input)                      | $0.067 per image                          |
| Gemini 3 Flash Preview                         | $0.50 (text/image/video), $1.00 (audio) | $3.00                                     |
| Gemini 3 Pro Image Preview                     | $2.00 (text input)                      | $0.134 per image                          |
| Gemini 2.5 Pro                                 | $1.25 (≤200k), $2.50 (>200k)           | $10.00 (≤200k), $15.00 (>200k)           |
| Gemini 2.5 Flash                               | $0.30 (text/image/video), $1.00 (audio) | $2.50                                     |
| Gemini 2.5 Flash-Lite                          | $0.10 (text/image/video), $0.30 (audio) | $0.40                                     |
| Gemini 2.5 Flash Native Audio Preview          | $0.50 (text), $3.00 (audio/video)       | $2.00 (text), $12.00 (audio)              |
| Gemini 2.5 Flash Image                         | $0.30 (text/image)                      | $0.039 per image                          |
| Gemini 2.5 Flash Preview TTS                   | $0.50 (text)                            | $10.00 (audio)                            |
| Gemini 2.5 Pro Preview TTS                     | $1.00 (text)                            | $20.00 (audio)                            |
| Gemini 2.5 Computer Use Preview                | $1.25 (≤200k), $2.50 (>200k)           | $10.00 (≤200k), $15.00 (>200k)           |
| Gemini 2.0 Flash (deprecated)                  | $0.10 (text/image/video), $0.70 (audio) | $0.40                                     |
| Gemini 2.0 Flash-Lite (deprecated)             | $0.075                                  | $0.30                                     |
| Gemini Embedding 2 Preview                     | $0.20 (text)                            | -                                         |
| Gemini Embedding                               | $0.15 (text)                            | -                                         |
| Gemini Robotics-ER 1.5 Preview                 | $0.30 (text/image/video), $1.00 (audio) | $2.50                                     |
| Imagen 4 Fast                                  | $0.02 per image                         | -                                         |
| Imagen 4 Standard                              | $0.04 per image                         | -                                         |
| Imagen 4 Ultra                                 | $0.06 per image                         | -                                         |
| Veo 3.1 Standard                               | $0.40 per second                        | -                                         |
| Veo 3.1 Fast                                   | $0.10 per second (720p)                 | -                                         |
| Veo 3.0 Standard                               | $0.40 per second                        | -                                         |
| Veo 3.0 Fast                                   | $0.10 per second (720p)                 | -                                         |
| Veo 2                                          | $0.35 per second                        | -                                         |
| Gemma 4                                        | Free                                    | Free                                      |
`
}

func (p *GeminiModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	if modelResult.PromptTokenCount == 0 && modelResult.ResponseTokenCount == 0 && modelResult.TotalTokenCount != 0 {
		modelResult.ResponseTokenCount = modelResult.TotalTokenCount
	}

	var inputPricePerMillionTokens, outputPricePerMillionTokens float64

	switch {
	// Gemini 3.1 series (Preview)
	case strings.Contains(p.subType, "gemini-3.1-pro"):
		// $2.00/≤200k, $4.00/>200k; using ≤200k as default
		inputPricePerMillionTokens = 2.00
		outputPricePerMillionTokens = 12.00

	case strings.Contains(p.subType, "gemini-3.1-flash-lite"):
		inputPricePerMillionTokens = 0.25
		outputPricePerMillionTokens = 1.50

	case strings.Contains(p.subType, "gemini-3.1-flash-live"):
		inputPricePerMillionTokens = 0.75  // text input
		outputPricePerMillionTokens = 4.50 // text output

	case strings.Contains(p.subType, "gemini-3.1-flash-image"):
		inputPricePerMillionTokens = 0.25
		outputPricePerMillionTokens = 3.00 // image output is $0.067/image; token price used for text output

	// Gemini 3 series (Preview)
	case strings.Contains(p.subType, "gemini-3-pro-image"):
		inputPricePerMillionTokens = 2.00
		outputPricePerMillionTokens = 12.00

	case strings.Contains(p.subType, "gemini-3-flash"):
		inputPricePerMillionTokens = 0.50
		outputPricePerMillionTokens = 3.00

	// Gemini 2.5 Pro (stable and preview)
	case strings.Contains(p.subType, "gemini-2.5-pro"):
		if strings.Contains(p.subType, "tts") {
			inputPricePerMillionTokens = 1.00
			outputPricePerMillionTokens = 20.00
		} else if strings.Contains(p.subType, "computer-use") {
			// using ≤200k pricing as default
			inputPricePerMillionTokens = 1.25
			outputPricePerMillionTokens = 10.00
		} else {
			// using ≤200k pricing as default
			inputPricePerMillionTokens = 1.25
			outputPricePerMillionTokens = 10.00
		}

	// Gemini 2.5 Flash series
	case strings.Contains(p.subType, "gemini-2.5-flash"):
		if strings.Contains(p.subType, "tts") {
			inputPricePerMillionTokens = 0.50
			outputPricePerMillionTokens = 10.00
		} else if strings.Contains(p.subType, "native-audio") {
			inputPricePerMillionTokens = 0.50  // text input default
			outputPricePerMillionTokens = 2.00 // text output default
		} else if strings.Contains(p.subType, "lite") {
			inputPricePerMillionTokens = 0.10
			outputPricePerMillionTokens = 0.40
		} else if strings.Contains(p.subType, "image") {
			inputPricePerMillionTokens = 0.30
			outputPricePerMillionTokens = 2.50 // text output; image output is per-image
		} else {
			// Standard 2.5 Flash
			inputPricePerMillionTokens = 0.30
			outputPricePerMillionTokens = 2.50
		}

	// Gemini 2.5 Computer Use Preview (separate from 2.5-pro match above)
	case strings.Contains(p.subType, "gemini-2.5-computer-use"):
		inputPricePerMillionTokens = 1.25
		outputPricePerMillionTokens = 10.00

	// Gemini 2.0 Flash models (deprecated)
	case strings.Contains(p.subType, "gemini-2.0-flash"):
		if strings.Contains(p.subType, "lite") {
			inputPricePerMillionTokens = 0.075
			outputPricePerMillionTokens = 0.30
		} else {
			inputPricePerMillionTokens = 0.10
			outputPricePerMillionTokens = 0.40
		}

	// Gemini 2.0 Pro models
	case strings.Contains(p.subType, "gemini-2.0-pro"):
		inputPricePerMillionTokens = 1.25
		outputPricePerMillionTokens = 10.00

	// Gemini 1.5 Flash models
	case strings.Contains(p.subType, "gemini-1.5-flash"):
		if strings.Contains(p.subType, "8b") {
			inputPricePerMillionTokens = 0.0375
			outputPricePerMillionTokens = 0.15
		} else {
			inputPricePerMillionTokens = 0.075
			outputPricePerMillionTokens = 0.30
		}

	// Gemini 1.5 Pro models
	case strings.Contains(p.subType, "gemini-1.5-pro"):
		inputPricePerMillionTokens = 1.25
		outputPricePerMillionTokens = 5.00

	// Gemini 1.0 Pro Vision models
	case strings.Contains(p.subType, "gemini-1.0-pro-vision"),
		strings.Contains(p.subType, "gemini-pro-vision"):
		inputPricePerMillionTokens = 0.125
		outputPricePerMillionTokens = 0.375

	// Gemini Embedding models
	case strings.Contains(p.subType, "gemini-embedding-2"):
		inputPricePerMillionTokens = 0.20
		outputPricePerMillionTokens = 0

	case strings.Contains(p.subType, "gemini-embedding"):
		inputPricePerMillionTokens = 0.15
		outputPricePerMillionTokens = 0

	// Gemini Robotics-ER
	case strings.Contains(p.subType, "gemini-robotics"):
		inputPricePerMillionTokens = 0.30
		outputPricePerMillionTokens = 2.50

	// Gemma models (free)
	case strings.Contains(p.subType, "gemma"):
		inputPricePerMillionTokens = 0
		outputPricePerMillionTokens = 0

	// LearnLM models (similar to Flash pricing)
	case strings.Contains(p.subType, "learnlm"):
		inputPricePerMillionTokens = 0.10
		outputPricePerMillionTokens = 0.40

	// Imagen 4 image generation models
	case strings.Contains(p.subType, "imagen-4.0-ultra"):
		modelResult.TotalPrice = 0.06
		modelResult.Currency = "USD"
		return nil

	case strings.Contains(p.subType, "imagen-4.0-fast"):
		modelResult.TotalPrice = 0.02
		modelResult.Currency = "USD"
		return nil

	case strings.Contains(p.subType, "imagen-4"):
		modelResult.TotalPrice = 0.04
		modelResult.Currency = "USD"
		return nil

	// Veo 3.1 video generation models
	case strings.Contains(p.subType, "veo-3.1-fast") || strings.Contains(p.subType, "veo-3.0-fast"):
		return fmt.Errorf(i18n.Translate(lang, "model:calculatePrice() error: video generation pricing requires duration information"))

	case strings.Contains(p.subType, "veo-3"):
		return fmt.Errorf(i18n.Translate(lang, "model:calculatePrice() error: video generation pricing requires duration information"))

	// Veo 2 video generation models
	case strings.Contains(p.subType, "veo-2"):
		return fmt.Errorf(i18n.Translate(lang, "model:calculatePrice() error: video generation pricing requires duration information"))

	// Experimental models (using default Flash pricing)
	case strings.Contains(p.subType, "gemini-exp"):
		inputPricePerMillionTokens = 0.10
		outputPricePerMillionTokens = 0.40

	// AQA model (free)
	case p.subType == "aqa":
		inputPricePerMillionTokens = 0
		outputPricePerMillionTokens = 0

	default:
		return fmt.Errorf(i18n.Translate(lang, "embedding:calculatePrice() error: unknown model type: %s"), p.subType)
	}

	// Convert from per million to per token pricing
	inputPricePerToken := inputPricePerMillionTokens / 1000000
	outputPricePerToken := outputPricePerMillionTokens / 1000000

	inputPrice := float64(modelResult.PromptTokenCount) * inputPricePerToken
	outputPrice := float64(modelResult.ResponseTokenCount) * outputPricePerToken

	modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
	modelResult.Currency = "USD"
	return nil
}

func isGeminiImagenModel(subType string) bool {
	// Imagen models use the GenerateImages API
	return strings.Contains(strings.ToLower(subType), "imagen-")
}

func isGeminiImagePreviewModel(subType string) bool {
	lower := strings.ToLower(subType)
	// Nano Banana models (gemini-*-image-preview, gemini-*-image) use GenerateContent with ResponseModalities
	return strings.Contains(lower, "-image") && !isGeminiImagenModel(subType)
}

// queryImagen uses the Imagen image API (GenerateImages). These models do not support CountTokens or GenerateContent.
func (p *GeminiModelProvider) queryImagen(ctx context.Context, client *genai.Client, question string, writer io.Writer, lang string) (*ModelResult, error) {
	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	cfg := &genai.GenerateImagesConfig{
		NumberOfImages: 1,
		OutputMIMEType: "image/png",
	}
	imgResp, err := client.Models.GenerateImages(ctx, p.subType, question, cfg)
	if err != nil {
		return nil, err
	}
	if imgResp == nil || len(imgResp.GeneratedImages) == 0 {
		return nil, fmt.Errorf("empty image generation response")
	}
	gen := imgResp.GeneratedImages[0]
	if gen == nil || gen.Image == nil || len(gen.Image.ImageBytes) == 0 {
		reason := ""
		if gen != nil {
			reason = gen.RAIFilteredReason
		}
		if reason != "" {
			return nil, fmt.Errorf("%s", reason)
		}
		return nil, fmt.Errorf("no image bytes in generation response")
	}

	img := gen.Image
	mime := img.MIMEType
	if mime == "" {
		mime = "image/png"
	}
	b64 := base64.StdEncoding.EncodeToString(img.ImageBytes)
	dataURL := fmt.Sprintf("data:%s;base64,%s", mime, b64)
	html := fmt.Sprintf("<img src=\"%s\" width=\"100%%\" height=\"auto\">", dataURL)
	if _, err := fmt.Fprint(writer, html); err != nil {
		return nil, err
	}
	flusher.Flush()

	modelResult := &ModelResult{
		ImageCount:         1,
		TotalTokenCount:    1,
		PromptTokenCount:   0,
		ResponseTokenCount: 0,
	}
	if err := p.calculatePrice(modelResult, lang); err != nil {
		return nil, err
	}
	return modelResult, nil
}

func (p *GeminiModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, agentInfo *AgentInfo, lang string) (*ModelResult, error) {
	ctx := context.Background()
	// Access your API key as an environment variable (see "Set up your API key" above)
	client, err := genai.NewClient(ctx,
		&genai.ClientConfig{
			APIKey:     p.secretKey,
			Backend:    genai.BackendGeminiAPI,
			HTTPClient: proxy.ProxyHttpClient,
		})
	if err != nil {
		return nil, err
	}

	if strings.HasPrefix(question, "$OpenAgentDryRun$") {
		modelResult, err := getDefaultModelResult(p.subType, question, "")
		if err != nil {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:cannot calculate tokens"))
		}
		if getContextLength(p.subType) > modelResult.TotalTokenCount {
			return modelResult, nil
		} else {
			return nil, fmt.Errorf(i18n.Translate(lang, "model:exceed max tokens"))
		}
	}

	if isGeminiImagenModel(p.subType) {
		return p.queryImagen(ctx, client, question, writer, lang)
	}

	model := client.Models

	// https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/get-token-count#gemini-get-token-count-samples-drest
	// has to use CountToken() to get
	contents := []*genai.Content{
		genai.NewContentFromText(question, genai.RoleUser),
	}
	promptTokenCountResp, err := client.Models.CountTokens(ctx, p.subType, contents, nil)
	if err != nil {
		return nil, err
	}

	messages := GenaiRawMessagesToMessages(question, history)

	var generateConfig *genai.GenerateContentConfig
	if isGeminiImagePreviewModel(p.subType) {
		generateConfig = &genai.GenerateContentConfig{
			ResponseModalities: []string{"TEXT", "IMAGE"},
		}
	}

	resp, err := model.GenerateContent(ctx, p.subType, messages, generateConfig)
	if err != nil {
		return nil, err
	}

	flusher, ok := writer.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf(i18n.Translate(lang, "model:writer does not implement http.Flusher"))
	}

	flushData := func(data []*genai.Part) error {
		for _, part := range data {
			var output string
			if part.InlineData != nil && len(part.InlineData.Data) > 0 {
				mime := part.InlineData.MIMEType
				if mime == "" {
					mime = "image/png"
				}
				b64 := base64.StdEncoding.EncodeToString(part.InlineData.Data)
				output = fmt.Sprintf("<img src=\"data:%s;base64,%s\" width=\"100%%\" height=\"auto\">", mime, b64)
				if _, err := fmt.Fprint(writer, output); err != nil {
					return err
				}
			} else if part.Text != "" {
				if _, err := fmt.Fprintf(writer, "event: message\ndata: %s\n\n", part.Text); err != nil {
					return err
				}
			}
			flusher.Flush()
		}
		return nil
	}

	err = flushData(resp.Candidates[0].Content.Parts)
	if err != nil {
		return nil, err
	}

	respTokenCount := int(resp.Candidates[0].TokenCount)
	promptTokenCount := int(promptTokenCountResp.TotalTokens)
	modelResult := &ModelResult{
		PromptTokenCount:   promptTokenCount,
		ResponseTokenCount: respTokenCount,
		TotalTokenCount:    promptTokenCount + respTokenCount,
	}

	err = p.calculatePrice(modelResult, lang)
	if err != nil {
		return nil, err
	}

	return modelResult, nil
}
