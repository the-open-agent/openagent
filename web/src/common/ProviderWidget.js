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
import * as ProviderBackend from "../backend/ProviderBackend";
import i18next from "i18next";

export async function checkProvider(provider, originalProvider) {
  const hasChanges = JSON.stringify(originalProvider) !== JSON.stringify(provider);
  if (hasChanges) {
    const saveRes = await ProviderBackend.updateProvider(provider.owner, provider.name, provider);
    if (saveRes.status !== "ok") {
      Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${saveRes.msg}`);
    }
  }
}

export async function checkMcpProvider(provider, originalProvider, updateMcpFn) {
  const hasChanges = JSON.stringify(originalProvider) !== JSON.stringify(provider);
  if (hasChanges) {
    const saveRes = await updateMcpFn(provider.owner, provider.name, provider);
    if (saveRes.status !== "ok") {
      Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${saveRes.msg}`);
    }
  }
}
