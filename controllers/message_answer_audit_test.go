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
	"errors"
	"testing"

	"github.com/the-open-agent/openagent/model"
)

func TestLlmCallOutcome(t *testing.T) {
	if got := llmCallOutcome(nil); got != "success" {
		t.Errorf("llmCallOutcome(nil) = %q, want success", got)
	}
	if got := llmCallOutcome(errors.New("boom")); got != "failure" {
		t.Errorf("llmCallOutcome(err) = %q, want failure", got)
	}
}

func TestLlmResponseTokens(t *testing.T) {
	if got := llmResponseTokens(nil); got != 0 {
		t.Errorf("llmResponseTokens(nil) = %d, want 0 (the error paths this feeds pass a nil result)", got)
	}

	result := &model.ModelResult{ResponseTokenCount: 42}
	if got := llmResponseTokens(result); got != 42 {
		t.Errorf("llmResponseTokens(result) = %d, want 42", got)
	}
}
