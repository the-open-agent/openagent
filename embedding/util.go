// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
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

package embedding

import (
	"errors"
	"fmt"
	"math"

	"github.com/the-open-agent/openagent/i18n"
)

func getPrice(tokenCount int, pricePerThousandTokens float64) float64 {
	res := (float64(tokenCount) / 1000.0) * pricePerThousandTokens
	res = math.Round(res*1e8) / 1e8
	return res
}

func float64ToFloat32(slice []float64) []float32 {
	newSlice := make([]float32, len(slice))
	for i, v := range slice {
		newSlice[i] = float32(v)
	}
	return newSlice
}

// newI18nError formats an i18n message safely without triggering go vet's
// "non-constant format string" warning on fmt.Errorf.
func newI18nError(lang string, format string, args ...any) error {
	msg := i18n.Translate(lang, format)
	if len(args) > 0 {
		msg = fmt.Sprintf(msg, args...)
	}
	return errors.New(msg)
}
