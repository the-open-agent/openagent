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

package stt

import (
	"context"
	"io"
)

type SpeechToTextResult struct {
	AudioDurationSeconds float64
	Price                float64
	Currency             string
}

type SpeechToTextProvider interface {
	GetPricing() string
	ProcessAudio(audioData io.Reader, ctx context.Context, lang string) (string, *SpeechToTextResult, error)
}

// StreamingSpeechToTextProvider is an optional capability for providers
// that can emit interim transcripts while audio is still arriving. The
// websocket controller type-asserts onto this interface so providers
// that only support batch mode keep working unchanged.
type StreamingSpeechToTextProvider interface {
	SpeechToTextProvider
	ProcessAudioStream(audioReader io.Reader, eventCh chan<- *StreamEvent, ctx context.Context, lang string) (string, *SpeechToTextResult, error)
}

// GetSpeechToTextProvider creates a new provider instance based on the provider type
func GetSpeechToTextProvider(typ string, subType string, clientSecret string, providerUrl string) (SpeechToTextProvider, error) {
	var p SpeechToTextProvider
	var err error

	if typ == "Alibaba Cloud" {
		p, err = NewAlibabacloudSpeechToTextProvider(typ, subType, clientSecret)
	}

	if err != nil {
		return nil, err
	}
	return p, nil
}
