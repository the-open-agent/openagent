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

export function getHubStores() {
  return fetch(`${Setting.ServerUrl}/api/get-hub-stores`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getGlobalStores(name = "", page = "", pageSize = "", field = "", value = "", sortField = "", sortOrder = "") {
  return fetch(`${Setting.ServerUrl}/api/get-global-stores?name=${name}&p=${page}&pageSize=${pageSize}&field=${field}&value=${value}&sortField=${sortField}&sortOrder=${sortOrder}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getStores(owner) {
  return fetch(`${Setting.ServerUrl}/api/get-stores?owner=${owner}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getStore(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/get-store?id=${owner}/${encodeURIComponent(name)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getStoreNames(owner) {
  return fetch(`${Setting.ServerUrl}/api/get-store-names?owner=${owner}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function updateStore(owner, name, store) {
  const newStore = Setting.deepCopy(store);
  return fetch(`${Setting.ServerUrl}/api/update-store?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newStore),
  }).then(res => Setting.handleFetchResponse(res));
}

export function addStore(store) {
  const newStore = Setting.deepCopy(store);
  return fetch(`${Setting.ServerUrl}/api/add-store`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newStore),
  }).then(res => Setting.handleFetchResponse(res));
}

export function forkStore(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/fork-store`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({owner, name}),
  }).then(res => Setting.handleFetchResponse(res));
}

export function deleteStore(store) {
  const newStore = Setting.deepCopy(store);
  return fetch(`${Setting.ServerUrl}/api/delete-store`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newStore),
  }).then(res => Setting.handleFetchResponse(res));
}

export function toggleStoreFavorite(favoriteType, storeOwner, storeName) {
  return fetch(`${Setting.ServerUrl}/api/toggle-store-favorite`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({type: favoriteType, storeOwner, storeName}),
  }).then(res => Setting.handleFetchResponse(res));
}

export function getStoreFavoriteStatus(storeOwner, storeName) {
  return fetch(`${Setting.ServerUrl}/api/get-store-favorite-status?storeOwner=${encodeURIComponent(storeOwner)}&storeName=${encodeURIComponent(storeName)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function getFavoredStores(favoriteType) {
  return fetch(`${Setting.ServerUrl}/api/get-favored-stores?type=${encodeURIComponent(favoriteType)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function refreshStoreVectors(store) {
  const newStore = Setting.deepCopy(store);
  return fetch(`${Setting.ServerUrl}/api/refresh-store-vectors`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
    body: JSON.stringify(newStore),
  }).then(res => Setting.handleFetchResponse(res));
}

export function claimStore(owner, name) {
  return fetch(`${Setting.ServerUrl}/api/claim-store?id=${owner}/${encodeURIComponent(name)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
    },
  }).then(res => Setting.handleFetchResponse(res));
}

export function addSharedStore(owner, name, targetUser) {
  return fetch(`${Setting.ServerUrl}/api/add-shared-store`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Accept-Language": Setting.getAcceptLanguage(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({owner, name, targetUser}),
  }).then(res => Setting.handleFetchResponse(res));
}
