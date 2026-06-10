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
)

const (
	GenerationTaskStatusRunning   = "running"
	GenerationTaskStatusSucceeded = "succeeded"
	GenerationTaskStatusFailed    = "failed"
)

type GenerationRequest struct {
	Prompt   string
	ImageURL string
}

type GenerationTask struct {
	TaskID string
}

type GenerationTaskResult struct {
	TaskID       string
	Status       string
	ErrorMessage string
	Result       *GenerationResult
}

type GenerationResult struct {
	TaskID             string
	VideoURL           string
	PromptTokenCount   int
	ResponseTokenCount int
	TotalTokenCount    int
	Price              float64
	Currency           string
}

type VideoProvider interface {
	GetPricing() string
	CreateVideoTask(ctx context.Context, request *GenerationRequest, lang string) (*GenerationTask, error)
	GetVideoTaskResult(ctx context.Context, taskID string, lang string) (*GenerationTaskResult, error)
}

func IsVideoModel(typ string, subType string) bool {
	switch typ {
	case "Volcano Engine":
		return IsVolcengineVideoModel(subType)
	default:
		return false
	}
}

func GetVideoProvider(typ string, subType string, clientSecret string, providerUrl string, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (VideoProvider, error) {
	if IsVideoModel(typ, subType) {
		return NewVolcengineProvider(subType, providerUrl, clientSecret, inputPricePerThousandTokens, outputPricePerThousandTokens, currency)
	}
	return nil, nil
}
