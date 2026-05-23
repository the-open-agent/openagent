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
import Sdk from "casdoor-js-sdk";
import * as StoreBackend from "./backend/StoreBackend";
import * as Conf from "./Conf";
import * as Cookie from "cookie";
import {deepCopy, showMessage} from "./SettingUtil";
import {getLanguage} from "./ProviderSetting";

export * from "./ProviderSetting";
export * from "./SettingUtil";
export * from "./ThemeSetting";

export let ServerUrl = "";
export let CasdoorSdk;

export function initServerUrl() {
  const hostname = window.location.hostname;
  if (hostname === "localhost") {
    ServerUrl = `http://${hostname}:14000`;
  }
}

export function isLocalhost() {
  const hostname = window.location.hostname;
  return hostname === "localhost";
}

export function initCasdoorSdk(config) {
  CasdoorSdk = new Sdk({
    serverUrl: config.issuer,
    clientId: config.clientId,
    appName: config.appName || "",
    organizationName: config.organizationName || "",
    redirectPath: config.redirectPath || "/callback",
  });
}

export function initWebConfig() {
  const curCookie = Cookie.parse(document.cookie);
  if (curCookie["jsonWebConfig"] && curCookie["jsonWebConfig"] !== "null") {
    const encoded = curCookie["jsonWebConfig"];
    const decoded = decodeURIComponent(encoded.replace(/\+/g, " "));
    const config = JSON.parse(decoded);
    Conf.setConfig(config);
  }
}

function getUrlWithLanguage(url) {
  if (url.includes("?")) {
    return `${url}&language=${getLanguage()}`;
  } else {
    return `${url}?language=${getLanguage()}`;
  }
}

export function getSignupUrl() {
  if (!Conf.AuthConfig || !Conf.AuthConfig.issuer) {
    return "";
  }
  return getUrlWithLanguage(CasdoorSdk.getSignupUrl());
}

export function isCasdoorAvailable() {
  return !!(Conf.AuthConfig && Conf.AuthConfig.issuer);
}

export function getSigninUrl() {
  if (!isCasdoorAvailable()) {
    return "";
  }
  return getUrlWithLanguage(CasdoorSdk.getSigninUrl());
}

export function getUserProfileUrl(userName, account) {
  if (isBasicLoginMode(account)) {
    return "#";
  }

  return getUrlWithLanguage(CasdoorSdk.getUserProfileUrl(userName, account));
}

export function getMyProfileUrl(account) {
  if (isBasicLoginMode(account)) {
    return "#";
  }

  const returnUrl = window.location.href;
  return getUrlWithLanguage(CasdoorSdk.getMyProfileUrl(account, returnUrl));
}

export function signin() {
  return CasdoorSdk.signin(ServerUrl);
}

export function redirectToLogin() {
  sessionStorage.setItem("from", window.location.pathname);
  window.location.replace(getSigninUrl());
  return null;
}

export function isGlobalAdminUser(account) {
  if (account === undefined || account === null) {
    return false;
  }
  return account.name === "admin" && account.isAdmin === true;
}

export function isAdminUser(account) {
  if (account === undefined || account === null) {
    return false;
  }
  return account.owner === "built-in" || account.isAdmin === true;
}

export function isChatAdminUser(account) {
  if (account === undefined || account === null) {
    return false;
  }
  return account.type === "chat-admin" || account.tag === "教师";
}

export function canViewAllUsers(account) {
  if (account === undefined || account === null) {
    return false;
  }
  return account.name === "admin" || isChatAdminUser(account);
}

/**
 * Built-in login mode (`account.owner === "basic"`): not a Casdoor-synced identity session.
 * The account may still be admin; this only distinguishes login/identity plumbing (profile URLs,
 * Casdoor sidebar links), not role or permissions.
 */
export function isBasicLoginMode(account) {
  if (account === undefined || account === null) {
    return false;
  }
  return account.owner === "basic";
}

export function isLocalAdminUser(account) {
  if (account === undefined || account === null) {
    return false;
  }

  if (isChatAdminUser(account)) {
    return true;
  }

  return isAdminUser(account);
}

export function isLocalAndStoreAdminUser(account) {
  if (account === undefined || account === null) {
    return false;
  }

  if (account.homepage === "non-store-admin") {
    return false;
  }

  if (isChatAdminUser(account)) {
    return true;
  }

  return isAdminUser(account);
}

export function isAnonymousUser(account) {
  if (account === undefined || account === null) {
    return false;
  }
  return account.type === "anonymous-user";
}

export function isChatUser(account) {
  if (account === undefined || account === null) {
    return false;
  }
  return account.type === "chat-user";
}

export function isTaskUser(account) {
  if (account === undefined || account === null) {
    return false;
  }

  return account.owner.endsWith("hjy");
}

export function isUserBoundToStore(account) {
  if (account === undefined || account === null) {
    return false;
  }
  // User is bound if homepage field is not empty
  // The actual store name validation is done on the backend
  return account.homepage !== undefined && account.homepage !== null && account.homepage !== "";
}

export function submitStoreEdit(storeObj) {
  const store = deepCopy(storeObj);
  store.fileTree = undefined;
  StoreBackend.updateStore(storeObj.owner, storeObj.name, store)
    .then((res) => {
      if (res.status === "ok") {
        showMessage("success", i18next.t("general:Successfully saved"));
      } else {
        showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    })
    .catch(error => {
      showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
    });
}

export function loadChatGenerationMode(owner, chatName) {
  if (!owner || !chatName) {
    return "text";
  }
  const raw = localStorage.getItem(`openagent_chat_generation_mode:${owner}:${chatName}`);
  return raw === "image" ? "image" : "text";
}

export function saveChatGenerationMode(owner, chatName, mode) {
  if (!owner || !chatName) {
    return;
  }
  if (mode === "image" || mode === "text") {
    localStorage.setItem(`openagent_chat_generation_mode:${owner}:${chatName}`, mode);
  }
}

export function getOrganization() {
  const organization = localStorage.getItem("organization");
  return organization !== null ? organization : "All";
}

export function getRequestOrganization(account) {
  if (isAdminUser(account)) {
    return getOrganization() === "All" ? account.owner : getOrganization();
  }
  return account.owner;
}

export function setStore(store) {
  localStorage.setItem("store", store);
  window.dispatchEvent(new Event("storeChanged"));
}

export function getStore() {
  const store = localStorage.getItem("store");
  return store !== null ? store : "All";
}

export function getRequestStore(account) {
  if (isLocalAdminUser(account)) {
    return getStore() === "All" ? "" : getStore();
  }
  return "";
}

export function isDefaultStoreSelected(account) {
  if (isLocalAdminUser(account)) {
    return getStore() === "All";
  }
  return true;
}

export function getBoolValue(key, defaultValue) {
  const value = localStorage.getItem(key);
  if (value === null) {
    return defaultValue;
  }
  return value === "true";
}

export function setBoolValue(key, value) {
  localStorage.setItem(key, `${value}`);
}

export function getFormTypeOptions() {
  return [
    {id: "records", name: "general:Records"},
    {id: "stores", name: "general:Stores"},
    {id: "vectors", name: "general:Vectors"},
    {id: "tasks", name: "general:Tasks"},
  ];
}

export function getFormTypeItems(formType) {
  if (formType === "records") {
    return [
      {name: "organization", label: "general:Organization", visible: true, width: "110"},
      {name: "id", label: "general:ID", visible: true, width: "90"},
      {name: "name", label: "general:Name", visible: true, width: "300"},
      {name: "clientIp", label: "general:Client IP", visible: true, width: "150"},
      {name: "createdTime", label: "general:Created time", visible: true, width: "150"},
      {name: "provider", label: "general:Provider", visible: true, width: "150"},
      {name: "provider2", label: "general:Provider 2", visible: true, width: "150"},
      {name: "user", label: "general:User", visible: true, width: "120"},
      {name: "method", label: "general:Method", visible: true, width: "110"},
      {name: "requestUri", label: "general:Request URI", visible: true, width: "200"},
      {name: "language", label: "general:Language", visible: true, width: "90"},
      {name: "query", label: "general:Query", visible: true, width: "90"},
      {name: "region", label: "general:Region", visible: true, width: "90"},
      {name: "city", label: "general:City", visible: true, width: "90"},
      {name: "unit", label: "general:Unit", visible: true, width: "90"},
      {name: "section", label: "general:Section", visible: true, width: "90"},
      {name: "response", label: "general:Response", visible: true, width: "90"},
      {name: "object", label: "general:Object", visible: true, width: "200"},
      {name: "errorText", label: "message:Error text", visible: true, width: "120"},
      {name: "isTriggered", label: "general:Is triggered", visible: true, width: "140"},
      {name: "action", label: "general:Action", visible: true, width: "150"},
      {name: "block", label: "general:Block", visible: true, width: "110"},
      {name: "block2", label: "general:Block 2", visible: true, width: "110"},
    ];
  } else if (formType === "stores") {
    return [
      {name: "name", label: "general:Name", visible: true, width: "120"},
      {name: "displayName", label: "general:Display name", visible: true},
      {name: "isDefault", label: "store:Is default", visible: true, width: "120"},
      {name: "chatCount", label: "store:Chat count", visible: true, width: "150"},
      {name: "messageCount", label: "chat:Message count", visible: true, width: "150"},
      {name: "vectorCount", label: "store:Vector count", visible: true, width: "150"},
      {name: "storageProvider", label: "store:Storage provider", visible: true, width: "250"},
      // { name: "splitProvider", label: "store:Split provider", visible: false, width: "200" },
      {name: "imageProvider", label: "store:Image provider", visible: true, width: "300"},
      {name: "modelProvider", label: "provider:Model provider", visible: true, width: "330"},
      {name: "embeddingProvider", label: "store:Embedding provider", visible: true, width: "300"},
      {name: "textToSpeechProvider", label: "store:Text-to-Speech provider", visible: true, width: "300"},
      {name: "speechToTextProvider", label: "store:Speech-to-Text provider", visible: true, width: "200"},
      {name: "mcpServer", label: "store:MCP server", visible: true, width: "250"},
      {name: "tools", label: "general:Tools", visible: true, width: "280"},
      {name: "memoryLimit", label: "store:Memory limit", visible: true, width: "120"},
      {name: "state", label: "general:State", visible: true, width: "90"},
    ];
  } else if (formType === "vectors") {
    return [
      {name: "name", label: "general:Name", visible: true, width: "140"},
      // { name: "displayName", label: "general:Display name", visible: false, width: "200" },
      {name: "store", label: "general:Store", visible: true, width: "130"},
      {name: "provider", label: "general:Provider", visible: true, width: "200"},
      {name: "file", label: "store:File", visible: true, width: "200"},
      {name: "index", label: "vector:Index", visible: true, width: "80"},
      {name: "text", label: "general:Text", visible: true, width: "200"},
      {name: "size", label: "general:Size", visible: true, width: "80"},
      {name: "data", label: "general:Data", visible: true, width: "200"},
      {name: "dimension", label: "vector:Dimension", visible: true, width: "80"},
    ];
  } else if (formType === "tasks") {
    return [
      {name: "name", label: "general:Name", visible: true, width: "160"},
      {name: "displayName", label: "general:Display name", visible: true, width: "200"},
      {name: "createdTime", label: "general:Created time", visible: true, width: "160"},
      {name: "provider", label: "provider:Model provider", visible: true, width: "250"},
      {name: "type", label: "general:Type", visible: true, width: "90"},
      {name: "subject", label: "store:Subject", visible: true, width: "200"},
      {name: "topic", label: "video:Topic", visible: true, width: "200"},
      {name: "result", label: "general:Result", visible: true, width: "200"},
      {name: "activity", label: "task:Activity", visible: true, width: "200"},
      {name: "grade", label: "store:Grade", visible: true, width: "200"},
      // { name: "application", label: "task:Application", visible: false, width: "180" },
      // { name: "path", label: "general:Path", visible: false },
      {name: "text", label: "general:Text", visible: true},
      {name: "labels", label: "task:Labels", visible: true, width: "250"},
      {name: "example", label: "task:Example", visible: true},
    ];
  } else {
    return [];
  }
}

export function filterTableColumns(columns, formItems, actionKey = "action") {
  if (!formItems || formItems.length === 0) {
    return columns;
  }
  const visibleColumns = formItems
    .filter(item => item.visible !== false)
    .map(item => {
      const matchedColumn = columns.find(col => col.key === item.name);

      if (matchedColumn) {
        return {
          ...matchedColumn,
          width: item.width !== undefined ? `${item.width}px` : matchedColumn.width,
          title: item.width !== undefined ? `${i18next.t(item.label)}` : matchedColumn.title,
        };
      }
      return null;
    })
    .filter(col => col !== null);

  const actionColumn = columns.find(col => col.key === actionKey);

  return [
    ...visibleColumns,
    actionColumn,
  ].filter(col => col);
}

export function getToolFunctions(tool) {
  const type = tool.type;
  const subType = tool.subType;

  // Each entry: { name, description, testContent }
  // testContent: example JSON string used by the test widget

  if (type === "time") {
    return [{
      name: "time",
      description: "Get current time or perform time calculations",
      testContent: JSON.stringify({tool: "time", arguments: {operation: "current", timezone: "Asia/Shanghai"}}, null, 2),
    }];
  }
  if (type === "web_search") {
    return [{
      name: "web_search",
      description: "Search the web using the configured search engine",
      testContent: JSON.stringify({tool: "web_search", arguments: {query: "OpenAgent web search", count: 3, language: "en", country: "us"}}, null, 2),
    }];
  }
  if (type === "shell") {
    return [{
      name: "shell",
      description: "Execute shell commands on the server",
      testContent: JSON.stringify({tool: "shell", arguments: {command: "echo hello"}}, null, 2),
    }];
  }
  if (type === "local_file") {
    return [
      {
        name: "local_special_dirs",
        description: "Return Desktop, Documents, and Downloads paths for the OS user running the OpenAgent backend",
        testContent: JSON.stringify({tool: "local_special_dirs", arguments: {}}, null, 2),
      },
      {
        name: "local_file_scan",
        description: "Scan an absolute local directory for all files and subdirectories",
        testContent: JSON.stringify({tool: "local_file_scan", arguments: {root: "/absolute/path/to/Desktop"}}, null, 2),
      },
      {
        name: "local_file_read",
        description: "Read text from a local file",
        testContent: JSON.stringify({tool: "local_file_read", arguments: {path: "/absolute/path/to/Desktop/report.pdf", offset: 0, limit: 12000}}, null, 2),
      },
      {
        name: "local_pdf_ocr_read",
        description: "Read a scanned local PDF through the configured or managed OCR HTTP endpoint",
        testContent: JSON.stringify({tool: "local_pdf_ocr_read", arguments: {path: "/absolute/path/to/Desktop/scanned.pdf"}}, null, 2),
      },
      {
        name: "local_file_write",
        description: "Write text to an absolute local path",
        testContent: JSON.stringify({tool: "local_file_write", arguments: {path: "/absolute/path/to/Desktop/Project Summaries/summary.md", content: "# Summary\\n\\nProject notes.", overwrite: false}}, null, 2),
      },
      {
        name: "local_file_move",
        description: "Move one local file after explicit user confirmation",
        testContent: JSON.stringify({tool: "local_file_move", arguments: {source: "/absolute/path/to/Desktop/report.pdf", target: "/absolute/path/to/Desktop/Project/report.pdf", confirmed: true, overwrite: false}}, null, 2),
      },
    ];
  }
  if (type === "web_fetch") {
    return [{
      name: "web_fetch",
      description: "Fetch and extract content from a web URL",
      testContent: JSON.stringify({tool: "web_fetch", arguments: {url: "https://openagentai.org", purpose: "get_list", max_length: 3000}}, null, 2),
    }];
  }
  if (type === "web_browser") {
    return [{
      name: "web_browser",
      description: "Open a web page in a browser and capture a screenshot",
      testContent: JSON.stringify({tool: "web_browser", arguments: {url: "https://openagentai.org", timeout: 60}}, null, 2),
    }];
  }
  if (type === "browser_use") {
    return [{
      name: "browser_use",
      description: "Automate browser interactions using AI-driven control",
      testContent: JSON.stringify({tool: "browser_use_open", arguments: {url: "https://openagentai.org"}}, null, 2),
    }];
  }
  if (type === "gui") {
    return [
      {name: "win_open_application", description: "Launch app", testContent: JSON.stringify({tool: "win_open_application", arguments: {target: "calc", method: "auto", wait_seconds: 2}}, null, 2)},
      {name: "win_focus_window", description: "Focus top-level window", testContent: JSON.stringify({tool: "win_focus_window", arguments: {title_contains: "Calculator"}}, null, 2)},
      {name: "win_find_element", description: "Find UIA element by criteria", testContent: JSON.stringify({tool: "win_find_element", arguments: {window_title_contains: "Calculator", control_type: "button", name_contains: "1"}}, null, 2)},
      {name: "win_interact", description: "click/set_text/get_text/hotkey", testContent: JSON.stringify({tool: "win_interact", arguments: {action: "click", element_id: "el_1"}}, null, 2)},
      {name: "win_wait", description: "Wait by time/window condition", testContent: JSON.stringify({tool: "win_wait", arguments: {window_title_contains: "Calculator", timeout_seconds: 10}}, null, 2)},
      {name: "win_assert", description: "Assert window/file/text condition", testContent: JSON.stringify({tool: "win_assert", arguments: {check: "window_exists", window_title_contains: "Calculator"}}, null, 2)},
      {name: "win_read_system_metric", description: "Read system metric (CPU, memory, etc.)", testContent: JSON.stringify({tool: "win_read_system_metric", arguments: {metric: "cpu_percent", duration_seconds: 10, interval_seconds: 1, aggregation: "avg"}}, null, 2)},
      {name: "win_word_write_and_save", description: "Write content to Word and save", testContent: JSON.stringify({tool: "win_word_write_and_save", arguments: {content: "CPU avg: 12.34%", file_name: "CPU_Report.docx", overwrite: true}}, null, 2)},
      {name: "win_safety_emergency_stop", description: "Emergency stop — halt all automation", testContent: JSON.stringify({tool: "win_safety_emergency_stop", arguments: {}}, null, 2)},
    ];
  }
  if (type === "video_download") {
    return [
      {name: "video_info", description: "Get video metadata (no download)", testContent: JSON.stringify({tool: "video_info", arguments: {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}, null, 2)},
      {name: "video_download", description: "Download video file", testContent: JSON.stringify({tool: "video_download", arguments: {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", output_dir: "videos", format: "bestvideo+bestaudio/best"}}, null, 2)},
      {name: "video_audio_extract", description: "Extract audio from video", testContent: JSON.stringify({tool: "video_audio_extract", arguments: {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", output_dir: "audio", audio_format: "mp3", audio_quality: "0"}}, null, 2)},
    ];
  }
  if (type === "office") {
    const allOffice = [
      {name: "word_read", description: "Read content from a Word document", testContent: JSON.stringify({tool: "word_read", arguments: {path: "/path/to/document.docx"}}, null, 2)},
      {name: "word_write", description: "Write content to a Word document", testContent: JSON.stringify({tool: "word_write", arguments: {path: "/path/to/output.docx", content: "Hello, World!\nThis is a new paragraph."}}, null, 2)},
      {name: "excel_read", description: "Read data from an Excel spreadsheet", testContent: JSON.stringify({tool: "excel_read", arguments: {path: "/path/to/spreadsheet.xlsx", sheet: "Sheet1"}}, null, 2)},
      {name: "excel_write", description: "Write data to an Excel spreadsheet", testContent: JSON.stringify({tool: "excel_write", arguments: {path: "/path/to/output.xlsx", data: "Name,Age\nAlice,30\nBob,25", sheet: "Sheet1"}}, null, 2)},
      {name: "pptx_read", description: "Read content from a PowerPoint presentation", testContent: JSON.stringify({tool: "pptx_read", arguments: {path: "/path/to/presentation.pptx"}}, null, 2)},
      {name: "pptx_write", description: "Write content to a PowerPoint presentation", testContent: JSON.stringify({tool: "pptx_write", arguments: {path: "/path/to/output.pptx", slides: ["Slide 1 title\nSlide 1 content", "Slide 2 title\nSlide 2 content"]}}, null, 2)},
    ];
    const subTypeMap = {
      "Word Read": [allOffice[0]],
      "Word Write": [allOffice[1]],
      "Excel Read": [allOffice[2]],
      "Excel Write": [allOffice[3]],
      "PowerPoint Read": [allOffice[4]],
      "PowerPoint Write": [allOffice[5]],
    };
    return subTypeMap[subType] || allOffice;
  }
  return [];
}
