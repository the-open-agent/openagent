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

import * as Setting from "../Setting";

export function getStoreWordCloud(storeName) {
  return fetch(`${Setting.ServerUrl}/api/get-store-word-cloud?storeName=${encodeURIComponent(storeName)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getStoreInsightsSummary(owner, storeName, period) {
  const url = `${Setting.ServerUrl}/api/get-store-insights-summary?owner=${encodeURIComponent(owner)}&storeName=${encodeURIComponent(storeName)}&period=${encodeURIComponent(period)}`;
  return fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}
