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

export function processSpeechToText(storeId, audioBlob) {
  // Create a FormData object to send the audio file
  const formData = new FormData();
  formData.append("audio", audioBlob);
  formData.append("storeId", storeId);

  return fetch(`${Setting.ServerUrl}/api/process-speech-to-text`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: formData,
  }).then(res => Setting.handleFetchResponse(res))
    .then(data => {
      if (data && data.status === "error") {
        throw new Error(data.msg || "Speech-to-text request failed");
      }
      return data;
    });
}

export function testSpeechToTextProvider(providerId, audioBlob) {
  const formData = new FormData();
  formData.append("audio", audioBlob);
  formData.append("providerId", providerId);

  return fetch(`${Setting.ServerUrl}/api/process-speech-to-text`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: formData,
  }).then(res => Setting.handleFetchResponse(res))
    .then(data => {
      if (data && data.status === "error") {
        throw new Error(data.msg || "Speech-to-text request failed");
      }
      return data;
    });
}
