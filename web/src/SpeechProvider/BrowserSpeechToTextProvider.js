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

import * as Setting from "../Setting";
import {showMessage} from "../Setting";
import i18next from "i18next";

// How long the recognition session can sit without producing any result
// (interim or final) before we treat the user as "done speaking" and stop
// the session. Reset by every onresult event.
const SILENCE_TIMEOUT_MS = 6000;

class BrowserSpeechToTextProvider {
  constructor(parent) {
    this.parent = parent;
    this.recognition = null;
    this.lastCallback = null;  // Store the callback for use when stopping
    this.onEndCallback = null;
    this.silenceTimer = null;
  }

  _resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      if (this.recognition) {
        // graceful stop → triggers onend → triggers onEndCallback → UI resets
        try {
          this.recognition.stop();
        } catch (e) {
          // stop() can throw if already stopping; safe to ignore.
        }
      }
    }, SILENCE_TIMEOUT_MS);
  }

  _clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  initBrowserRecognition(resultCallback, onEndCallback) {
    // Initialize Web Speech API recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Setting.showMessage("error", i18next.t("chat:Speech recognition not supported in this browser"));
      return null;
    }

    // Clean up any existing recognition instance before creating a new one
    if (this.recognition) {
      this.stopRecognition();
    }

    this.recognition = new SpeechRecognition();
    // continuous=true keeps the mic open across short pauses, so the user
    // can string several sentences together. The silence timer below is
    // what ultimately ends the session — after SILENCE_TIMEOUT_MS of no
    // results, recognition.stop() fires onend and the UI resets.
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = Setting.getLanguage();

    // Store the callback for use when stopping
    this.lastCallback = resultCallback;
    this.onEndCallback = onEndCallback;

    this.recognition.onresult = (event) => {
      // Any result (interim or final) means the user is still actively
      // speaking, so push the silence deadline forward.
      this._resetSilenceTimer();

      if (resultCallback && typeof resultCallback === "function") {
        // Check if the last result is final
        const results = event.results;
        const lastResult = results[results.length - 1];
        const isFinal = lastResult.isFinal;

        // Create a modified event with isFinal flag
        const modifiedEvent = {
          results: event.results,
          isFinal: isFinal,
        };

        resultCallback(modifiedEvent);
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        Setting.showMessage("error", `${i18next.t("chat:Failed to recognize speech")}: ${event.error}`);
      }
    };

    // Browsers end recognition on their own (our silence timer, network
    // drop, tab switch, mobile Safari ~60s cap) even when continuous is true.
    // Without surfacing onend, callers can't reset their "recording" UI state
    // and the mic button stays stuck.
    this.recognition.onend = () => {
      this._clearSilenceTimer();
      if (typeof this.onEndCallback === "function") {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
    };

    try {
      this.recognition.start();
      // Arm the silence timer right away so that if the user clicks the mic
      // but never speaks, the session still self-terminates.
      this._resetSilenceTimer();
      return this.recognition;
    } catch (error) {
      Setting.showMessage("error", `${i18next.t("chat:Failed to recognize speech")}: ${error.message}`);
      this.recognition = null;
      return null;
    }
  }

  stopRecognition() {
    if (this.recognition) {
      try {
        // Before aborting, collect any existing results and send a final synthetic event
        if (this.recognition.results && this.recognition.results.length > 0 && this.lastCallback) {
          const transcript = this._collectTranscript(this.recognition.results);

          if (transcript && transcript.trim() !== "") {
            // Only send if we have actual text
            const finalEvent = {
              results: [[{
                transcript: transcript,
                confidence: 0.9,
              }]],
              isFinal: true,
            };

            // Call the callback with our synthetic final result
            this.lastCallback(finalEvent);

            // Clear the stored callback
            this.lastCallback = null;
          }
        }

        // User-initiated stop already updates UI in stopVoiceInput; suppress
        // the onend callback so we don't double-fire setState. Also cancel
        // any pending silence timer.
        this.onEndCallback = null;
        this._clearSilenceTimer();

        // Now abort the recognition
        this.recognition.abort();
      } catch (error) {
        showMessage("error", `Error stopping speech recognition: ${error.message}`);
      }

      this.recognition = null;
    }
  }

  // Helper method to collect transcript from recognition results
  _collectTranscript(results) {
    let transcript = "";

    try {
      // Convert recognition results to transcript text
      for (let i = 0; i < results.length; i++) {
        // Take the most confident alternative from each result
        if (results[i][0] && results[i][0].transcript) {
          transcript += results[i][0].transcript + " ";
        }
      }
    } catch (error) {
      showMessage("error", `Error collecting transcript: ${error.message}`);
    }

    return transcript.trim();
  }

  cleanup() {
    this.stopRecognition();
    this.lastCallback = null;
  }
}

export default BrowserSpeechToTextProvider;
