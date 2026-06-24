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

package stt

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/casibase/dashscope-go-sdk/paraformer"
	"github.com/gorilla/websocket"
)

const (
	// paraformerStreamWSURL is the bidirectional websocket endpoint
	// shared by paraformer-realtime and fun-asr realtime models.
	paraformerStreamWSURL = "wss://dashscope.aliyuncs.com/api-ws/v1/inference"

	// paraformerWSReadLimit caps a single incoming text frame. The SDK
	// (casibase/dashscope-go-sdk) hardcodes this at 1024 *and* silently
	// drops errReadLimit instead of surfacing it, which made long-form
	// streaming cut off the moment the cumulative transcript JSON
	// exceeded ~1 KiB. 1 MiB is plenty for any realistic transcript.
	paraformerWSReadLimit = 1 << 20

	paraformerWSWriteWait  = 30 * time.Second
	paraformerWSPongWait   = 30 * time.Second
	paraformerWSPingPeriod = paraformerWSPongWait * 8 / 10
)

// finishTaskMsg is the JSON envelope sent to paraformer to signal that
// the client is done streaming audio. Defined separately from
// paraformer.PayloadIn so the marshaled body contains only the fields
// the action expects (the upstream rejects unexpected payload fields
// like model/task on finish-task).
type finishTaskMsg struct {
	Header  paraformer.ReqHeader     `json:"header"`
	Payload finishTaskPayloadWrapper `json:"payload"`
}

type finishTaskPayloadWrapper struct {
	Input map[string]interface{} `json:"input"`
}

// sendFinishTask tells paraformer the current task is over so it can
// emit the final task-finished event and close the connection. Errors
// here are best-effort — if the write fails, the conn is already broken
// and the outer defer will clean up.
func sendFinishTask(conn *websocket.Conn, taskID string) {
	msg := finishTaskMsg{
		Header: paraformer.ReqHeader{
			Streaming: "duplex",
			TaskID:    taskID,
			Action:    "finish-task",
		},
		Payload: finishTaskPayloadWrapper{
			Input: map[string]interface{}{},
		},
	}
	buf, err := json.Marshal(msg)
	if err != nil {
		return
	}
	_ = conn.SetWriteDeadline(time.Now().Add(paraformerWSWriteWait))
	_ = conn.WriteMessage(websocket.TextMessage, buf)
}

// runParaformerStreamingASR is a drop-in replacement for the SDK's
// (q *TongyiClient).CreateSpeechToTextGeneration. It opens a websocket
// directly to paraformer, sends the run-task request, forwards binary
// PCM frames from `reader` upstream, and routes each upstream text
// frame into request.StreamingFn. Returns when the pipe drains, the
// reader sees a transport close, or the context is canceled.
func runParaformerStreamingASR(ctx context.Context, request *paraformer.Request, token string, reader *bufio.Reader) error {
	header := http.Header{}
	header.Add("Authorization", token)

	conn, resp, err := websocket.DefaultDialer.DialContext(ctx, paraformerStreamWSURL, header)
	if err != nil {
		return fmt.Errorf("paraformer ws dial: %w", err)
	}
	if resp != nil && resp.Body != nil {
		_ = resp.Body.Close()
	}
	defer conn.Close()

	conn.SetReadLimit(paraformerWSReadLimit)
	if err := conn.SetReadDeadline(time.Now().Add(paraformerWSPongWait)); err != nil {
		return err
	}
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(paraformerWSPongWait))
	})

	// The run-task message must precede any audio frames so upstream
	// knows which task to associate them with. Done synchronously here
	// before any writer goroutine starts, so there's no contention.
	reqJSON, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("paraformer marshal request: %w", err)
	}
	if err := conn.SetWriteDeadline(time.Now().Add(paraformerWSWriteWait)); err != nil {
		return err
	}
	if err := conn.WriteMessage(websocket.TextMessage, reqJSON); err != nil {
		return fmt.Errorf("paraformer send run-task: %w", err)
	}

	sessCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	var (
		firstErrMu sync.Mutex
		firstErr   error
	)
	setErr := func(e error) {
		if e == nil {
			return
		}
		firstErrMu.Lock()
		if firstErr == nil {
			firstErr = e
		}
		firstErrMu.Unlock()
		cancel()
	}

	// pcmCh decouples the blocking pipe read from the writer goroutine
	// so the writer can multiplex audio frames with keepalive pings via
	// a single select.
	pcmCh := make(chan []byte, 16)

	var wg sync.WaitGroup

	// Upstream -> callback. gorilla/websocket allows only one concurrent
	// reader, so this goroutine owns ReadMessage exclusively.
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer cancel()
		for {
			msgType, data, rerr := conn.ReadMessage()
			if rerr != nil {
				if !errors.Is(rerr, context.Canceled) &&
					!websocket.IsCloseError(rerr,
						websocket.CloseNormalClosure,
						websocket.CloseGoingAway) {
					setErr(rerr)
				}
				return
			}
			// Any incoming frame means the session is healthy — extend
			// the read deadline so long recognitions don't trip the
			// idle timeout between pong cycles.
			_ = conn.SetReadDeadline(time.Now().Add(paraformerWSPongWait))
			if msgType != websocket.TextMessage {
				continue
			}
			if request.StreamingFn != nil {
				if cbErr := request.StreamingFn(sessCtx, data); cbErr != nil {
					setErr(cbErr)
					return
				}
			}
		}
	}()

	// PCM pipe -> pcmCh. The pipe.Read here is the blocking call; pushing
	// onto the buffered channel lets the writer goroutine continue to
	// service its ping ticker without waiting on the pipe.
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(pcmCh)
		for {
			buf := make([]byte, 1024)
			n, rerr := reader.Read(buf)
			if n > 0 {
				select {
				case pcmCh <- buf[:n]:
				case <-sessCtx.Done():
					return
				}
			}
			if rerr != nil {
				return
			}
		}
	}()

	// pcmCh + pingTicker -> upstream. Single writer to keep
	// gorilla/websocket's write-once-at-a-time invariant.
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer cancel()
		pingTicker := time.NewTicker(paraformerWSPingPeriod)
		defer pingTicker.Stop()
		for {
			select {
			case <-sessCtx.Done():
				return
			case chunk, ok := <-pcmCh:
				if !ok {
					// Pipe drained (EOS from controller). Tell upstream
					// we're done, then immediately initiate a close from
					// our side so the reader doesn't sit blocked on
					// ReadMessage waiting for an upstream-initiated close
					// that may never come (which surfaces as an i/o
					// timeout 30s later). The cost is potentially missing
					// the task-finished event, but transcripts have
					// already been streamed live to the frontend during
					// recording, and ProcessAudio's main loop falls
					// through to a 5s grace timeout that returns whatever
					// partial transcript was accumulated.
					sendFinishTask(conn, request.Header.TaskID)
					_ = conn.SetWriteDeadline(time.Now().Add(paraformerWSWriteWait))
					_ = conn.WriteMessage(websocket.CloseMessage,
						websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
					return
				}
				if err := conn.SetWriteDeadline(time.Now().Add(paraformerWSWriteWait)); err != nil {
					setErr(err)
					return
				}
				if err := conn.WriteMessage(websocket.BinaryMessage, chunk); err != nil {
					setErr(err)
					return
				}
			case <-pingTicker.C:
				if err := conn.SetWriteDeadline(time.Now().Add(paraformerWSWriteWait)); err != nil {
					setErr(err)
					return
				}
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					setErr(err)
					return
				}
			}
		}
	}()

	wg.Wait()

	firstErrMu.Lock()
	defer firstErrMu.Unlock()
	return firstErr
}
