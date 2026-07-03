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

export function getIssues(store) {
  return fetch(`${Setting.ServerUrl}/api/get-issues?store=${encodeURIComponent(store)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getIssue(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/get-issue?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function addIssue(issue) {
  return fetch(`${Setting.ServerUrl}/api/add-issue`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(issue),
  }).then(res => Setting.handleFetchResponse(res));
}

export function updateIssue(owner, name, issue) {
  const newIssue = Setting.deepCopy(issue);
  return fetch(`${Setting.ServerUrl}/api/update-issue?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newIssue),
  }).then(res => Setting.handleFetchResponse(res));
}

export function deleteIssue(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/delete-issue`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({owner, name}),
  }).then(res => Setting.handleFetchResponse(res));
}
