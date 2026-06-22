// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controllers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/beego/beego/logs"
	"github.com/gorilla/websocket"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/stt"
)

// sttStreamUpgrader is the gorilla/websocket upgrader for the streaming
// STT endpoint. The browser sends audio frames as binary messages and
// receives transcript updates as JSON text messages. The endpoint accepts
// connections from the same origin as well as the dev frontend on a
// different port; tightening this is left to the deployer's reverse proxy.
var sttStreamUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// SpeechToTextStream
// @Title SpeechToTextStream
// @Tag STT API
// @Description Bidirectional websocket: client sends raw 16-bit PCM 16kHz
//
//	mono audio frames as binary messages, server streams JSON
//	{text, isFinal} transcript updates back as text messages.
//	The client closes the socket (or sends a binary frame of
//	length 0) when the user stops speaking.
//
// @Param storeId query string true "The store ID whose STT provider is used"
// @router /speech-stream [get]
func (c *ApiController) SpeechToTextStream() {
	storeId := c.GetString("storeId")
	if storeId == "" {
		http.Error(c.Ctx.ResponseWriter, "Missing required parameter: storeId", http.StatusBadRequest)
		return
	}

	store, err := object.ResolveStoreFromId(storeId)
	if err != nil {
		http.Error(c.Ctx.ResponseWriter, err.Error(), http.StatusBadRequest)
		return
	}
	if store == nil {
		http.Error(c.Ctx.ResponseWriter, "store not found", http.StatusNotFound)
		return
	}

	providerRow, err := store.GetSpeechToTextProvider()
	if err != nil {
		http.Error(c.Ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	if providerRow == nil {
		http.Error(c.Ctx.ResponseWriter, "no STT provider configured on this store", http.StatusBadRequest)
		return
	}

	providerObj, err := providerRow.GetSpeechToTextProvider(c.GetAcceptLanguage())
	if err != nil {
		http.Error(c.Ctx.ResponseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	streamer, ok := providerObj.(stt.StreamingSpeechToTextProvider)
	if !ok {
		http.Error(c.Ctx.ResponseWriter, "the configured STT provider does not support streaming", http.StatusBadRequest)
		return
	}

	conn, err := sttStreamUpgrader.Upgrade(c.Ctx.ResponseWriter, c.Ctx.Request, nil)
	if err != nil {
		logs.Error("[stt-stream] websocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Beego will try to flush an HTTP response on Finish() unless we mark
	// the response as already handled.
	c.Ctx.ResponseWriter.Started = true

	pr, pw := io.Pipe()
	eventCh := make(chan *stt.StreamEvent, 16)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// browser -> alibaba: read binary audio frames off the websocket and
	// shovel them into the pipe that feeds the SDK.
	go func() {
		defer pw.Close()
		for {
			msgType, data, err := conn.ReadMessage()
			if err != nil {
				return
			}
			// A zero-length binary frame is the agreed end-of-stream signal
			// from the browser; closing the pipe writer lets the SDK send
			// the final task to paraformer.
			if msgType == websocket.BinaryMessage {
				if len(data) == 0 {
					return
				}
				if _, werr := pw.Write(data); werr != nil {
					return
				}
			}
		}
	}()

	// alibaba -> browser: forward each transcript event as a JSON text
	// frame so the frontend can do JSON.parse without binary handling.
	go func() {
		for ev := range eventCh {
			payload, jerr := json.Marshal(ev)
			if jerr != nil {
				continue
			}
			if werr := conn.WriteMessage(websocket.TextMessage, payload); werr != nil {
				return
			}
		}
	}()

	// Block here until the SDK is done with the pipe (browser closed the
	// socket, EOF on read end, or paraformer reported completion/error).
	finalText, _, sttErr := streamer.ProcessAudioStream(pr, eventCh, ctx, c.GetAcceptLanguage())
	close(eventCh)

	// Best-effort final message so the client knows the session is done
	// even if no result-generated events ever fired (very short audio).
	if sttErr != nil {
		payload, _ := json.Marshal(map[string]string{"error": sttErr.Error()})
		_ = conn.WriteMessage(websocket.TextMessage, payload)
		logs.Error("[stt-stream] ProcessAudioStream error: %v", sttErr)
	} else if finalText != "" {
		payload, _ := json.Marshal(stt.StreamEvent{Text: finalText, IsFinal: true})
		_ = conn.WriteMessage(websocket.TextMessage, payload)
	}
}
