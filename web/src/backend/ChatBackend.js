// Copyright 2023 The OpenAgent Authors. All Rights Reserved.
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

export function getGlobalChats(page = "", pageSize = "", field = "", value = "", sortField = "", sortOrder = "", store = "") {
  return fetch(`${Setting.ServerUrl}/api/get-global-chats?p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}&store=${encodeURIComponent(store)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getChats(user, storeName = "", page = "", pageSize = "", field = "", value = "", sortField = "", sortOrder = "", selectedUser = "", startTime = "", endTime = "") {
  return fetch(`${Setting.ServerUrl}/api/get-chats?user=${user}&selectedUser=${selectedUser}&store=${storeName}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}&startTime=${startTime}&endTime=${endTime}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getChat(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/get-chat?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getChatStatus(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/get-chat-status?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function updateChat(owner, name, chat) {
  const newChat = Setting.deepCopy(chat);
  return fetch(`${Setting.ServerUrl}/api/update-chat?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newChat),
  }).then(res => Setting.handleFetchResponse(res));
}

export function addChat(chat) {
  const newChat = Setting.deepCopy(chat);
  return fetch(`${Setting.ServerUrl}/api/add-chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newChat),
  }).then(res => Setting.handleFetchResponse(res));
}

export function deleteChat(chat) {
  const newChat = Setting.deepCopy(chat);
  return fetch(`${Setting.ServerUrl}/api/delete-chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newChat),
  }).then(res => Setting.handleFetchResponse(res));
}
