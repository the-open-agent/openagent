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

import * as Setting from "../Setting";
import i18next from "i18next";

// How long the websocket session may sit without a new transcript event
// before we treat the user as "done speaking" and stop. Same idea as the
// browser-builtin silence timer; needed here because the upstream SDK
// does not send a finish-task to paraformer on its own, so without this
// the session would only end on the server's 60s hard timeout.
const SILENCE_TIMEOUT_MS = 3000;

// Bidirectional websocket STT: captures microphone via AudioWorklet,
// streams 16-bit PCM 16kHz mono chunks to /api/speech-stream, and feeds
// each interim/final transcript event back to ChatBox via the same
// resultCallback shape the browser-builtin Web Speech path uses.
class StreamingSpeechToTextProvider {
  constructor(parent) {
    this.parent = parent;
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.workletNode = null;
    this.sourceNode = null;
    this.resultCallback = null;
    this.onEndCallback = null;
    this.isActive = false;
    this.silenceTimer = null;
  }

  _resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      // Trigger the same path as a manual stop: send EOS upstream and
      // disconnect the mic. The websocket onclose handler then runs
      // _teardown, which fires the onEndCallback so ChatBox auto-sends.
      this.stop();
    }, SILENCE_TIMEOUT_MS);
  }

  _clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  async start(store, resultCallback, onEndCallback) {
    if (this.isActive) {
      return;
    }
    this.resultCallback = resultCallback;
    this.onEndCallback = onEndCallback;

    if (!navigator.mediaDevices || !window.AudioContext || !window.AudioWorkletNode) {
      throw new Error(i18next.t("chat:Streaming speech recognition is not supported in this browser"));
    }

    // 1. microphone
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    // 2. AudioContext + worklet. The worklet downsamples to 16kHz PCM and
    // posts ArrayBuffers back to the main thread; we then ship them out
    // over the websocket. Not connecting the worklet to destination means
    // the mic does not loop back through the speakers.
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule("/pcm-worklet.js");
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");
    this.sourceNode.connect(this.workletNode);

    // 3. websocket
    const apiBase = Setting.ServerUrl || window.location.origin;
    const apiURL = new URL(apiBase, window.location.origin);
    const wsProto = apiURL.protocol === "https:" ? "wss:" : "ws:";
    const storeId = `${store.owner}/${store.name}`;
    const wsURL = `${wsProto}//${apiURL.host}/api/speech-stream?storeId=${encodeURIComponent(storeId)}`;
    this.ws = new WebSocket(wsURL);
    this.ws.binaryType = "arraybuffer";

    // Buffer PCM frames produced before the socket is ready, then drain
    // them on open so we don't lose the user's first words.
    const pendingChunks = [];

    this.workletNode.port.onmessage = (event) => {
      if (!this.isActive) {
        return;
      }
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(event.data);
      } else {
        pendingChunks.push(event.data);
      }
    };

    this.ws.onopen = () => {
      while (pendingChunks.length > 0) {
        this.ws.send(pendingChunks.shift());
      }
      // Arm the silence timer once the socket is actually open so we
      // don't include the handshake time in the silence budget.
      this._resetSilenceTimer();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.error) {
          Setting.showMessage("error", `${i18next.t("chat:Failed to recognize speech")}: ${msg.error}`);
          return;
        }
        if (typeof msg.text === "string" && this.resultCallback) {
          // Any transcript update means the user is still speaking, so
          // push the silence deadline forward.
          this._resetSilenceTimer();
          // Match the synthetic event shape Browser/Remote providers use,
          // so ChatBox.processVoiceResult can stay unchanged.
          this.resultCallback({
            results: [[{transcript: msg.text}]],
            isFinal: !!msg.isFinal,
          });
        }
      } catch (e) {
        // Ignore malformed messages; the next event usually overwrites.
      }
    };

    this.ws.onerror = () => {
      Setting.showMessage("error", i18next.t("chat:Speech recognition websocket failed"));
      this._teardown();
    };

    this.ws.onclose = () => {
      this._teardown();
    };

    this.isActive = true;
  }

  // stop is what ChatBox calls when the user clicks the mic button to end
  // recording explicitly. Send the agreed end-of-stream marker (zero-length
  // binary frame) so the server can finalize with paraformer, then tear
  // down the audio graph. The websocket closes itself once the server
  // returns the final transcript event.
  stop() {
    if (!this.isActive) {
      return;
    }
    this._clearSilenceTimer();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(new ArrayBuffer(0));
      } catch (e) {
        // best effort
      }
    }
    // Disconnect mic immediately so the user doesn't see a mic-in-use
    // indicator while waiting for the final transcript.
    if (this.workletNode) {
      try {this.workletNode.disconnect();} catch (e) {/* ignore */}
    }
    if (this.sourceNode) {
      try {this.sourceNode.disconnect();} catch (e) {/* ignore */}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.isActive = false;
  }

  _teardown() {
    this.isActive = false;
    this._clearSilenceTimer();
    if (this.workletNode) {
      try {this.workletNode.disconnect();} catch (e) {/* ignore */}
      this.workletNode = null;
    }
    if (this.sourceNode) {
      try {this.sourceNode.disconnect();} catch (e) {/* ignore */}
      this.sourceNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.ws) {
      try {this.ws.close();} catch (e) {/* ignore */}
      this.ws = null;
    }
    if (typeof this.onEndCallback === "function") {
      const cb = this.onEndCallback;
      this.onEndCallback = null;
      cb();
    }
  }

  cleanup() {
    this.stop();
    this._teardown();
  }
}

export default StreamingSpeechToTextProvider;
