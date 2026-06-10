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

package video

import (
	"context"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/proxy"
	"github.com/volcengine/volcengine-go-sdk/service/arkruntime"
	"github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"
	"github.com/volcengine/volcengine-go-sdk/volcengine"
)

const (
	defaultVolcengineArkBaseURL = "https://ark.cn-beijing.volces.com/api/v3"
	defaultVolcengineCurrency   = "CNY"
)

type VolcengineProvider struct {
	subType                      string
	endpointID                   string
	apiKey                       string
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
	useCustomPricing             bool
}

func NewVolcengineProvider(subType string, endpointID string, apiKey string, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*VolcengineProvider, error) {
	useCustomPricing := inputPricePerThousandTokens != 0 || outputPricePerThousandTokens != 0
	currency = strings.TrimSpace(currency)
	if currency == "" {
		currency = defaultVolcengineCurrency
	}
	if !useCustomPricing {
		currency = defaultVolcengineCurrency
	}
	return &VolcengineProvider{
		subType:                      subType,
		endpointID:                   endpointID,
		apiKey:                       apiKey,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
		useCustomPricing:             useCustomPricing,
	}, nil
}

func IsVolcengineVideoModel(subType string) bool {
	return strings.Contains(strings.ToLower(subType), "doubao-seedance")
}

func trimModelDate(subType string) string {
	re := regexp.MustCompile(`-\d{6}$`)
	return re.ReplaceAllString(subType, "")
}

func normalizeModelID(subType string) string {
	subType = strings.ToLower(strings.TrimSpace(trimModelDate(subType)))
	return strings.ReplaceAll(subType, ".", "-")
}

func (p *VolcengineProvider) GetPricing() string {
	return `URL:
https://www.volcengine.com/docs/82379/1544106

| Model ID                              | Input Price per 1M tokens (yuan) | Output Price per 1M tokens (yuan) |
|---------------------------------------|----------------------------------|-----------------------------------|
| doubao-seedance-2-0-260128            | 46.0                             | 0.0                               |
| doubao-seedance-2-0-fast-260128       | 37.0                             | 0.0                               |
| doubao-seedance-1-5-pro-251215        | 16.0                             | 0.0                               |
| doubao-seedance-1-0-pro-250528        | 15.0                             | 0.0                               |
| doubao-seedance-1-0-pro-fast-251015   | 4.2                              | 0.0                               |
| doubao-seedance-1-0-lite-t2v-250428   | 10.0                             | 0.0                               |
| doubao-seedance-1-0-lite-i2v-250428   | 10.0                             | 0.0                               |
`
}

func (p *VolcengineProvider) CreateVideoTask(ctx context.Context, request *GenerationRequest, lang string) (*GenerationTask, error) {
	if request == nil || strings.TrimSpace(request.Prompt) == "" {
		return nil, errors.New(i18n.Translate(lang, "video:The prompt should not be empty"))
	}

	client := p.newClient()
	taskID, err := p.createTask(ctx, client, request)
	if err != nil {
		return nil, err
	}

	return &GenerationTask{TaskID: taskID}, nil
}

func (p *VolcengineProvider) GetVideoTaskResult(ctx context.Context, taskID string, lang string) (*GenerationTaskResult, error) {
	client := p.newClient()
	task, err := p.getTask(ctx, client, taskID)
	if err != nil {
		return nil, err
	}

	status := strings.ToLower(strings.TrimSpace(task.Status))
	switch status {
	case model.StatusSucceeded, "success", "completed":
		return p.succeededTaskResult(taskID, task, lang)
	case model.StatusFailed, model.StatusCancelled, "canceled":
		result := &GenerationTaskResult{
			TaskID: taskID,
			Status: GenerationTaskStatusFailed,
		}
		if task.Error != nil {
			result.ErrorMessage = task.Error.Message
		}
		return result, nil
	default:
		return &GenerationTaskResult{
			TaskID: taskID,
			Status: GenerationTaskStatusRunning,
		}, nil
	}
}

func (p *VolcengineProvider) succeededTaskResult(taskID string, task *model.GetContentGenerationTaskResponse, lang string) (*GenerationTaskResult, error) {
	if task.Content.VideoURL == "" {
		return nil, fmt.Errorf("video generation task %s succeeded but no video_url was returned", taskID)
	}

	result := &GenerationResult{
		TaskID:             taskID,
		VideoURL:           task.Content.VideoURL,
		PromptTokenCount:   task.Usage.PromptTokens,
		ResponseTokenCount: task.Usage.CompletionTokens,
		TotalTokenCount:    task.Usage.TotalTokens,
	}
	if result.TotalTokenCount == 0 {
		result.TotalTokenCount = 1
	}
	if result.PromptTokenCount == 0 && result.TotalTokenCount > 0 {
		result.PromptTokenCount = result.TotalTokenCount
		result.ResponseTokenCount = 0
	}

	if err := p.calculatePrice(result, lang); err != nil {
		return nil, err
	}
	return &GenerationTaskResult{
		TaskID: taskID,
		Status: GenerationTaskStatusSucceeded,
		Result: result,
	}, nil
}

func (p *VolcengineProvider) calculatePrice(result *GenerationResult, lang string) error {
	price := 0.0
	if p.useCustomPricing {
		inputPrice := getPrice(result.PromptTokenCount, p.inputPricePerThousandTokens)
		outputPrice := getPrice(result.ResponseTokenCount, p.outputPricePerThousandTokens)
		result.Price = inputPrice + outputPrice
		result.Currency = p.currency
		return nil
	}

	priceTable := map[string][2]float64{
		"doubao-seedance-2-0":          {0.0460, 0.0},
		"doubao-seedance-2-0-fast":     {0.0370, 0.0},
		"doubao-seedance-1-5-pro":      {0.0160, 0.0},
		"doubao-seedance-1-0-pro":      {0.0150, 0.0},
		"doubao-seedance-1-0-pro-fast": {0.0042, 0.0},
		"doubao-seedance-1-0-lite":     {0.0100, 0.0},
		"doubao-seedance-1-0-lite-t2v": {0.0100, 0.0},
		"doubao-seedance-1-0-lite-i2v": {0.0100, 0.0},
	}

	subType := normalizeModelID(p.subType)
	if priceItem, ok := priceTable[subType]; ok {
		inputPrice := getPrice(result.PromptTokenCount, priceItem[0])
		outputPrice := getPrice(result.ResponseTokenCount, priceItem[1])
		price = inputPrice + outputPrice
	} else {
		return fmt.Errorf(i18n.Translate(lang, "video:calculatePrice() error: unknown model type: %s"), subType)
	}

	result.Price = price
	result.Currency = defaultVolcengineCurrency
	return nil
}

func (p *VolcengineProvider) createTask(ctx context.Context, client *arkruntime.Client, request *GenerationRequest) (string, error) {
	content := []*model.CreateContentGenerationContentItem{
		{
			Type: model.ContentGenerationContentItemTypeText,
			Text: volcengine.String(request.Prompt),
		},
	}
	if strings.TrimSpace(request.ImageURL) != "" {
		content = append(content, &model.CreateContentGenerationContentItem{
			Type: model.ContentGenerationContentItemTypeImage,
			ImageURL: &model.ImageURL{
				URL: strings.TrimSpace(request.ImageURL),
			},
		})
	}

	taskRequest := model.CreateContentGenerationTaskRequest{
		Model:   p.modelID(),
		Content: content,
	}

	response, err := client.CreateContentGenerationTask(ctx, taskRequest)
	if err != nil {
		if request.ImageURL != "" && strings.Contains(err.Error(), "resource download failed") {
			return "", fmt.Errorf("volcengine failed to read image_url %q: %w", safeImageURLForError(request.ImageURL), err)
		}
		return "", err
	}
	if response.ID == "" {
		return "", fmt.Errorf("volcengine video task create failed: missing task id")
	}
	return response.ID, nil
}

func safeImageURLForError(imageURL string) string {
	if strings.HasPrefix(imageURL, "data:") {
		return "<inline image data>"
	}
	if len(imageURL) > 256 {
		return imageURL[:256] + "..."
	}
	return imageURL
}

func (p *VolcengineProvider) getTask(ctx context.Context, client *arkruntime.Client, taskID string) (*model.GetContentGenerationTaskResponse, error) {
	response, err := client.GetContentGenerationTask(ctx, model.GetContentGenerationTaskRequest{ID: taskID})
	if err != nil {
		return nil, err
	}
	if response.Error != nil && response.Error.Message != "" {
		return nil, fmt.Errorf("volcengine video task query failed: %s", response.Error.Message)
	}
	return &response, nil
}

func (p *VolcengineProvider) newClient() *arkruntime.Client {
	options := []arkruntime.ConfigOption{
		arkruntime.WithBaseUrl(p.baseURL()),
	}
	if proxy.ProxyHttpClient != nil {
		clonedClient := *proxy.ProxyHttpClient
		clonedClient.Timeout = 60 * time.Second
		options = append(options, arkruntime.WithHTTPClient(&clonedClient))
	}
	return arkruntime.NewClientWithApiKey(strings.TrimSpace(p.apiKey), options...)
}

func (p *VolcengineProvider) baseURL() string {
	baseURL := defaultVolcengineArkBaseURL
	if strings.HasPrefix(p.endpointID, "http://") || strings.HasPrefix(p.endpointID, "https://") {
		baseURL = strings.TrimRight(p.endpointID, "/")
	}
	return baseURL
}

func (p *VolcengineProvider) modelID() string {
	if p.endpointID != "" && !strings.HasPrefix(p.endpointID, "http://") && !strings.HasPrefix(p.endpointID, "https://") {
		return p.endpointID
	}
	return p.subType
}

func getPrice(tokenCount int, pricePerThousandTokens float64) float64 {
	res := (float64(tokenCount) / 1000.0) * pricePerThousandTokens
	res = math.Round(res*1e8) / 1e8
	return res
}
