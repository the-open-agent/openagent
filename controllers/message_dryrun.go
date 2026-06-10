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

	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/video"
)

// dryRunWriter is a dummy writer that implements both io.Writer and http.Flusher
// It discards all writes and is used for dry run queries that need a Flusher
type dryRunWriter struct{}

func (w *dryRunWriter) Write(p []byte) (n int, err error) {
	return len(p), nil
}

func (w *dryRunWriter) Flush() {}

// shouldPerformDryRun determines if a dry run estimation should be performed
// before generating the actual AI answer. Dry run is skipped for:
// - Reason models (they have different execution paths)
// - Queries with agent clients (agent-based workflows)
func shouldPerformDryRun(providerType string, modelSubType string, hasMcpTools bool) bool {
	return !isReasonModel(modelSubType) && !video.IsVideoModel(providerType, modelSubType) && !hasMcpTools
}

// validateTransactionBeforeAIGeneration performs a dry run to estimate cost and validates
// the user has sufficient balance before proceeding with AI generation.
// This avoids expensive operations if the user cannot afford the transaction.
func validateTransactionBeforeAIGeneration(
	message *object.Message,
	chat *object.Chat,
	store *object.Store,
	question string,
	modelProvider *object.Provider,
	modelProviderObj model.ModelProvider,
	acceptLanguage string,
	responseErrorFunc func(*object.Message, string),
) error {
	if !shouldPerformDryRun(modelProvider.Type, modelProvider.SubType, false) {
		return nil
	}

	// Get recent messages for context in estimation
	history, err := object.GetRecentRawMessages(chat.Name, message.CreatedTime, store.MemoryLimit)
	if err != nil {
		responseErrorFunc(message, err.Error())
		return err
	}

	// Prefix question with dry run marker to trigger estimation without actual AI call
	dryRunQuestion := model.DryRunPrefix + question

	// Use dryRunWriter which implements both io.Writer and http.Flusher
	// Some model providers require http.Flusher even for dry run
	dryRunResult, err := modelProviderObj.QueryText(dryRunQuestion, &dryRunWriter{}, history, store.Prompt, nil, nil, acceptLanguage)
	if err != nil {
		responseErrorFunc(message, fmt.Sprintf("failed to estimate token count: %s", err.Error()))
		return err
	}

	// Create a temporary message with estimated price for dry run validation
	tempMessage := &object.Message{
		Owner:         message.Owner,
		CreatedTime:   message.CreatedTime,
		Chat:          message.Chat,
		Name:          message.Name,
		ModelProvider: modelProvider.Name,
		User:          message.User,
		Price:         dryRunResult.TotalPrice,
		Currency:      dryRunResult.Currency,
	}

	// Validate transaction in dry run mode before AI generation
	err = object.ValidateTransactionForMessage(tempMessage)
	if err != nil {
		responseErrorFunc(message, err.Error())
		return err
	}

	return nil
}
