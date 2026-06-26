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

import i18next from "i18next";
import * as Setting from "../Setting";

export function getGlobalMessages(page = "", pageSize = "", field = "", value = "", sortField = "", sortOrder = "", store = "") {
  return fetch(`${Setting.ServerUrl}/api/get-global-messages?p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}&store=${encodeURIComponent(store)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getMessages(user, selectedUser = "") {
  return fetch(`${Setting.ServerUrl}/api/get-messages?user=${user}&selectedUser=${selectedUser}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getChatMessages(owner, chat) {
  return fetch(`${Setting.ServerUrl}/api/get-messages?owner=${owner}&chat=${chat}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

const eventSourceMap = new Map();

export function getMessageAnswer(owner, name, onMessage, onReason, onTool, onSearch, onVector, onError, onEnd, onInfo, onChat, onToolDelta, onStatus) {
  if (eventSourceMap.has(`${owner}/${name}`)) {
    return;
  }
  // EventSource cannot set Accept-Language, so pass the UI language as a query
  // param. Backend's GetAcceptLanguage() prefers this over the header.
  const lang = i18next.language || "en";
  const eventSource = new EventSource(`${Setting.ServerUrl}/api/get-message-answer?id=${owner}/${encodeURIComponent(name)}&language=${encodeURIComponent(lang)}`, {
    withCredentials: true,
  });
  eventSourceMap.set(`${owner}/${name}`, eventSource);

  eventSource.addEventListener("message", (e) => {
    onMessage(e.data);
  });

  eventSource.addEventListener("reason", (e) => {
    onReason(e.data);
  });

  eventSource.addEventListener("tool-start", (e) => {
    onTool(e.data);
  });

  eventSource.addEventListener("tool", (e) => {
    onTool(e.data);
  });

  if (onToolDelta) {
    eventSource.addEventListener("tool-delta", (e) => {
      onToolDelta(e.data);
    });
  }

  eventSource.addEventListener("search", (e) => {
    onSearch(e.data);
  });

  if (onVector) {
    eventSource.addEventListener("vector", (e) => {
      onVector(e.data);
    });
  }

  if (onInfo) {
    eventSource.addEventListener("myinfo", (e) => {
      onInfo(e.data);
    });
  }

  if (onStatus) {
    eventSource.addEventListener("status", (e) => {
      onStatus(e.data);
    });
  }

  if (onChat) {
    eventSource.addEventListener("chat", (e) => {
      try {
        onChat(JSON.parse(e.data));
      } catch {
        // ignore malformed chat events
      }
    });
  }

  eventSource.addEventListener("myerror", (e) => {
    onError(e.data);
    eventSource.close();
    eventSourceMap.delete(`${owner}/${name}`);
  });

  eventSource.addEventListener("error", (e) => {
    let error = e.data;
    if (!error) {
      error = "Unknown error";
    }
    onError(error);
    eventSource.close();
    eventSourceMap.delete(`${owner}/${name}`);
  });

  eventSource.addEventListener("end", (e) => {
    onEnd(e.data);
    eventSource.close();
    eventSourceMap.delete(`${owner}/${name}`);
  });
}

export function getAnswer(provider, question, framework, video, tool = "") {
  return fetch(`${Setting.ServerUrl}/api/get-answer?provider=${provider}&question=${encodeURIComponent(question)}&framework=${encodeURIComponent(framework)}&video=${encodeURIComponent(video)}&tool=${encodeURIComponent(tool)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getMessage(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/get-message?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function updateMessage(owner, name, message, isHitOnly = false) {
  const newMessage = Setting.deepCopy(message);
  return fetch(`${Setting.ServerUrl}/api/update-message?id=${owner}/${encodeURIComponent(name)}&isHitOnly=${isHitOnly}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newMessage),
  }).then(res => Setting.handleFetchResponse(res));
}

export function closeMessageEventSource(owner, name, cancel = false) {
  const key = `${owner}/${name}`;
  const found = eventSourceMap.has(key);
  if (found) {
    eventSourceMap.get(key).close();
    eventSourceMap.delete(key);
  }
  if (cancel) {
    cancelMessageAnswer(owner, name).catch(() => {});
  }
  return found;
}

export function cancelMessageAnswer(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/cancel-message-answer?id=${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function addMessage(message) {
  const newMessage = Setting.deepCopy(message);
  return fetch(`${Setting.ServerUrl}/api/add-message`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newMessage),
  }).then(res => Setting.handleFetchResponse(res));
}

export function deleteMessage(message) {
  const newMessage = Setting.deepCopy(message);
  return fetch(`${Setting.ServerUrl}/api/delete-message`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newMessage),
  }).then(res => Setting.handleFetchResponse(res));
}

export function deleteWelcomeMessage(message) {
  const newMessage = Setting.deepCopy(message);
  return fetch(`${Setting.ServerUrl}/api/delete-welcome-message`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newMessage),
  }).then(res => Setting.handleFetchResponse(res));
}
