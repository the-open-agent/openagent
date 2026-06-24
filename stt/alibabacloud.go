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
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"sync"
	"time"

	dashscopego "github.com/casibase/dashscope-go-sdk"

	"github.com/casibase/dashscope-go-sdk/paraformer"
	"github.com/the-open-agent/openagent/i18n"
)

type AlibabacloudSpeechToTextProvider struct {
	typ       string
	subType   string
	secretKey string

	// streamCh is non-nil when the caller wants live transcripts (set by
	// ProcessAudioStream). The provider then emits a StreamEvent every
	// time paraformer pushes a "result-generated" event. The instance is
	// per-request (see GetSpeechToTextProvider in object/provider.go),
	// so this field is safe to mutate without a lock.
	streamCh chan<- *StreamEvent
}

// StreamEvent is one transcript update from the upstream STT service.
// Text is the cumulative transcript so far (completed segments + current
// in-progress segment), so the consumer can simply replace its input
// each time without managing diffs.
type StreamEvent struct {
	Text    string `json:"text"`
	IsFinal bool   `json:"isFinal"`
}

// SpeechSegment represents a single segment of transcribed speech
type SpeechSegment struct {
	Text       string
	BeginTime  float64
	EndTime    float64
	IsComplete bool
}

// NewAlibabacloudSpeechToTextProvider creates a new instance of the Alibabacloud STT provider
func NewAlibabacloudSpeechToTextProvider(typ string, subType string, secretKey string) (*AlibabacloudSpeechToTextProvider, error) {
	return &AlibabacloudSpeechToTextProvider{
		typ:       typ,
		subType:   subType,
		secretKey: secretKey,
	}, nil
}

// GetPricing returns the pricing information for Alibabacloud ASR service
func (p *AlibabacloudSpeechToTextProvider) GetPricing() string {
	return `URL:
https://help.aliyun.com/zh/model-studio/paraformer-speech-recognition/
ASR models:

|     Models      |    Price          |
|-----------------|-------------------|
|    Paraformer   |   0.288 yuan/hour |
`
}

// calculatePrice calculates the price based on audio duration
func (p *AlibabacloudSpeechToTextProvider) calculatePrice(res *SpeechToTextResult) error {
	pricePerHour := 0.288
	res.Price = getPrice(res.AudioDurationSeconds, pricePerHour)
	res.Currency = "CNY"
	return nil
}

// getFullTranscript combines all speech segments into a complete transcript
func getFullTranscript(completedSegments []*SpeechSegment, currentSegment *SpeechSegment) string {
	var fullText string
	for _, segment := range completedSegments {
		if segment.IsComplete {
			fullText += segment.Text + " "
		}
	}

	if currentSegment != nil {
		fullText += currentSegment.Text
	}

	return fullText
}

// ProcessAudio processes an audio stream and returns the transcribed text
func (p *AlibabacloudSpeechToTextProvider) ProcessAudio(audioReader io.Reader, ctx context.Context, lang string) (string, *SpeechToTextResult, error) {
	res := &SpeechToTextResult{
		AudioDurationSeconds: 0,
		Price:                0.0,
		Currency:             "",
	}

	model := paraformer.ParaformerRealTimeV1
	if p.subType != "" {
		model = p.subType
	}
	client := dashscopego.NewTongyiClient(model, p.secretKey)

	var (
		completedSegments []*SpeechSegment
		currentSegment    *SpeechSegment
		taskID            string
		recognitionDone   bool
		recognitionError  error
		apiCallCompleted  bool
		totalDuration     float64
		mutex             sync.Mutex
		resultUpdated     = make(chan struct{}, 1)
		startTime         = time.Now()
	)

	// StreamCallback function to handle API responses
	streamCallbackFn := func(ctx context.Context, chunk []byte) error {
		var response map[string]interface{}
		if err := json.Unmarshal(chunk, &response); err != nil {
			return nil
		}

		header, ok := response["header"].(map[string]interface{})
		if !ok {
			return nil
		}

		event, ok := header["event"].(string)
		if !ok {
			return nil
		}

		if taskID == "" {
			if id, ok := header["task_id"].(string); ok && id != "" {
				taskID = id
			}
		}

		// Handle different event types
		switch event {
		case "result-generated":
			// Extract sentence data
			payload, ok := response["payload"].(map[string]interface{})
			if !ok {
				return nil
			}
			output, ok := payload["output"].(map[string]interface{})
			if !ok {
				return nil
			}
			sentence, ok := output["sentence"].(map[string]interface{})
			if !ok {
				return nil
			}
			text, ok := sentence["text"].(string)
			if !ok || text == "" {
				return nil
			}
			beginTime := 0.0
			if bt, ok := sentence["begin_time"].(float64); ok {
				beginTime = bt
			}
			endTime := 0.0
			hasEndTime := false
			if et, ok := sentence["end_time"].(interface{}); ok && et != nil {
				if etFloat, ok := et.(float64); ok {
					endTime = etFloat
					hasEndTime = true
				}
			}

			mutex.Lock()
			if hasEndTime {
				newSegment := &SpeechSegment{
					Text:       text,
					BeginTime:  beginTime,
					EndTime:    endTime,
					IsComplete: true,
				}
				completedSegments = append(completedSegments, newSegment)
				currentSegment = nil

				if endTime > totalDuration {
					totalDuration = endTime
				}
			} else {
				// This is a partial segment still in progress
				currentSegment = &SpeechSegment{
					Text:       text,
					BeginTime:  beginTime,
					EndTime:    0,
					IsComplete: false,
				}
			}
			cumulative := getFullTranscript(completedSegments, currentSegment)
			mutex.Unlock()

			// Streaming consumers get every transcript update live.
			// Batch consumers leave streamCh nil and only get the final
			// aggregated text via the ProcessAudio return value.
			if p.streamCh != nil {
				select {
				case p.streamCh <- &StreamEvent{Text: cumulative, IsFinal: hasEndTime}:
				default:
					// Slow consumer: drop the interim update. The next
					// event (or the final return value) will catch them up.
				}
			}

			select {
			case resultUpdated <- struct{}{}:
			default:
				// Channel buffer full, ignore
			}

			// Get audio duration if available in the payload
			if usage, hasUsage := payload["usage"].(map[string]interface{}); hasUsage {
				if duration, hasDuration := usage["duration"].(float64); hasDuration {
					mutex.Lock()
					if duration > totalDuration {
						totalDuration = duration
					}
					mutex.Unlock()
				}
			}

		// Paraformer's actual completion event name is "task-finished".
		// "completed" was a leftover that never matched anything; kept
		// as a tolerated alias in case some model variant uses it.
		case "task-finished", "completed":
			mutex.Lock()
			recognitionDone = true
			res.AudioDurationSeconds = totalDuration
			mutex.Unlock()

			select {
			case resultUpdated <- struct{}{}:
			default:
				// Channel buffer full, ignore
			}

		// Likewise paraformer's failure event is "task-failed"; keep
		// "error" for compatibility with any older/other event shape.
		case "task-failed", "error":
			message := "unknown error"
			if msg, hasMsg := header["message"].(string); hasMsg {
				message = msg
			}

			mutex.Lock()
			recognitionError = fmt.Errorf(i18n.Translate(lang, "stt:API error: %s"), message)
			recognitionDone = true
			mutex.Unlock()

			select {
			case resultUpdated <- struct{}{}:
			default:
				// Channel buffer full, ignore
			}
		}

		return nil
	}

	// Create request parameters
	headerPara := paraformer.ReqHeader{
		Streaming: "duplex",
		TaskID:    paraformer.GenerateTaskID(),
		Action:    "run-task",
	}

	// Batch callers upload a full WAV blob; streaming callers feed raw
	// 16-bit PCM bytes from an AudioWorklet, so the format header sent
	// upstream has to match.
	audioFormat := "wav"
	if p.streamCh != nil {
		audioFormat = "pcm"
	}

	payload := paraformer.PayloadIn{
		Parameters: paraformer.Parameters{
			SampleRate: 16000,
			Format:     audioFormat,
		},
		Input:     map[string]interface{}{},
		Task:      "asr",
		TaskGroup: "audio",
		Function:  "recognition",
	}

	req := &paraformer.Request{
		Header:      headerPara,
		Payload:     payload,
		StreamingFn: streamCallbackFn,
	}

	reader := bufio.NewReader(audioReader)

	// Create a non-blocking channel to signal when the API call is complete
	apiCallDone := make(chan error, 1)

	// Start the API call in a goroutine
	go func() {
		apiCallDone <- client.CreateSpeechToTextGeneration(ctx, req, reader)
	}()

	// Configuration for timeouts
	const (
		timeout              = 60 * time.Second
		waitAfterAPICallTime = 5 * time.Second
	)

	// Create a ticker for periodic checks
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	// Create timeout timer
	timeoutTimer := time.NewTimer(timeout)
	defer timeoutTimer.Stop()

	// Main wait loop
	for {
		select {
		case <-resultUpdated:
			// Result was updated, check if we're done
			mutex.Lock()
			isDone := recognitionDone
			currentError := recognitionError
			mutex.Unlock()

			if isDone {
				if currentError != nil {
					return "", res, currentError
				}

				// Get the full transcript
				mutex.Lock()
				fullTranscript := getFullTranscript(completedSegments, currentSegment)
				res.AudioDurationSeconds = totalDuration
				mutex.Unlock()

				// Calculate price
				if err := p.calculatePrice(res); err != nil {
					return fullTranscript, res, err
				}

				return fullTranscript, res, nil
			}

		case err := <-apiCallDone:
			if err != nil {
				return "", res, fmt.Errorf(i18n.Translate(lang, "stt:speech recognition API error: %v"), err)
			}
			apiCallCompleted = true
			timeoutTimer.Reset(waitAfterAPICallTime)
		case <-timeoutTimer.C:
			// If this is the grace period timeout after API call completion
			mutex.Lock()
			fullTranscript := getFullTranscript(completedSegments, currentSegment)
			mutex.Unlock()

			if apiCallCompleted && fullTranscript != "" {
				// API call completed but no completion event received
				mutex.Lock()
				if res.AudioDurationSeconds == 0 {
					res.AudioDurationSeconds = totalDuration
				}
				mutex.Unlock()

				// Calculate price
				if err := p.calculatePrice(res); err != nil {
					return fullTranscript, res, err
				}

				return fullTranscript, res, nil
			}

			if fullTranscript != "" {
				mutex.Lock()
				if res.AudioDurationSeconds == 0 {
					processingTime := time.Since(startTime).Seconds()
					res.AudioDurationSeconds = processingTime * 0.25
				}
				mutex.Unlock()

				// Calculate price
				if err := p.calculatePrice(res); err != nil {
					return fullTranscript, res, err
				}

				return fullTranscript, res, nil
			}

			return "", res, fmt.Errorf(i18n.Translate(lang, "stt:speech recognition timed out after %v seconds"), timeout.Seconds())
		}
	}
}

// ProcessAudioStream is the streaming variant of ProcessAudio. It calls
// the same engine but pushes each transcript update onto eventCh as soon
// as paraformer emits it. The returned text is still the final aggregate,
// so callers that want both per-event UI updates and the final text can
// use this one method. eventCh is left open; the caller closes it.
func (p *AlibabacloudSpeechToTextProvider) ProcessAudioStream(audioReader io.Reader, eventCh chan<- *StreamEvent, ctx context.Context, lang string) (string, *SpeechToTextResult, error) {
	p.streamCh = eventCh
	defer func() { p.streamCh = nil }()
	return p.ProcessAudio(audioReader, ctx, lang)
}
