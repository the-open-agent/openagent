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

import {Tag, Tooltip, message, theme} from "antd";
import {QuestionCircleOutlined, SyncOutlined} from "@ant-design/icons";
import {isMobile as isMobileDevice} from "react-device-detect";
import i18next from "i18next";
import Sdk from "casdoor-js-sdk";
import xlsx from "xlsx";
import FileSaver from "file-saver";
import moment from "moment/moment";
import * as StoreBackend from "./backend/StoreBackend";
import {StaticBaseUrl, ThemeDefault} from "./Conf";
import Identicon from "identicon.js";
import md5 from "md5";
import React from "react";
import {v4 as uuidv4} from "uuid";
import * as Conf from "./Conf";
import * as Cookie from "cookie";

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
  CasdoorSdk = new Sdk(config);
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
  if (!Conf.AuthConfig || !Conf.AuthConfig.serverUrl) {
    return "";
  }
  return getUrlWithLanguage(CasdoorSdk.getSignupUrl());
}

export function isCasdoorAvailable() {
  return !!(Conf.AuthConfig && Conf.AuthConfig.serverUrl);
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

export function getUserAvatar(message, account) {
  if (message.author === "AI") {
    return getDefaultAiAvatar();
  }

  // If account exists and has an avatar, construct URL for other users
  if (account && account.avatar) {
    // Find the last slash position
    const lastSlashIndex = account.avatar.lastIndexOf("/");
    if (lastSlashIndex !== -1) {
      // Get the base URL
      const baseUrl = account.avatar.substring(0, lastSlashIndex + 1);
      // Get the original filename
      const originalFilename = account.avatar.substring(lastSlashIndex + 1);

      const extension = originalFilename.substring(originalFilename.lastIndexOf("."));

      return `${baseUrl}${message.author}${extension}`;
    }
  }

  // If message author does not have an avatar, generate an Identicon
  const identicon = new Identicon(md5(message.author), 420);
  return "data:image/png;base64," + identicon;
}

export function signin() {
  return CasdoorSdk.signin(ServerUrl);
}

export function parseJson(s) {
  if (s === "") {
    return null;
  } else {
    return JSON.parse(s);
  }
}

/**
 * Reads a fetch Response body and returns parsed JSON, or a normalized {status: "error", msg}
 * when HTTP failed or the body is not JSON (e.g. HTML error pages).
 */
export async function handleFetchResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (!res.ok) {
        const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);
        return {
          status: "error",
          msg: `HTTP ${res.status} ${res.statusText || ""}`.trim() + (preview ? `: ${preview}` : ""),
        };
      }
      throw new Error("Invalid JSON response");
    }
  }
  if (!res.ok) {
    const msg = (data && (data.msg || data.message)) || `HTTP ${res.status} ${res.statusText || ""}`.trim();
    return {status: "error", msg};
  }
  return data;
}

export function myParseInt(i) {
  const res = parseInt(i);
  return isNaN(res) ? 0 : res;
}

export function myParseFloat(f) {
  const res = parseFloat(f);
  return isNaN(res) ? 0.0 : res;
}

export function openLink(link) {
  // this.props.history.push(link);
  const w = window.open("about:blank");
  w.location.href = link;
}

export function goToLink(link) {
  window.location.href = link;
}

export function goToLinkSoft(ths, link) {
  ths.props.history.push(link);
}

export function showMessage(type, text) {
  if (type === "") {
    return;
  } else if (type === "success") {
    message.success(text);
  } else if (type === "error") {
    message.error(text);
  }
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

export function deepCopy(obj) {
  if (obj === null) {
    return null;
  }

  return Object.assign({}, obj);
}

export function insertRow(array, row, i) {
  return [...array.slice(0, i), row, ...array.slice(i)];
}

export function addRow(array, row) {
  return [...array, row];
}

export function prependRow(array, row) {
  return [row, ...array];
}

export function deleteRow(array, i) {
  // return array = array.slice(0, i).concat(array.slice(i + 1));
  return [...array.slice(0, i), ...array.slice(i + 1)];
}

export function swapRow(array, i, j) {
  return [...array.slice(0, i), array[j], ...array.slice(i + 1, j), array[i], ...array.slice(j + 1)];
}

export function trim(str, ch) {
  if (str === undefined) {
    return undefined;
  }

  let start = 0;
  let end = str.length;

  while (start < end && str[start] === ch) {++start;}

  while (end > start && str[end - 1] === ch) {--end;}

  return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}

export function isMobile() {
  // return getIsMobileView();
  return isMobileDevice;
}

export function getFormattedDate(date) {
  if (date === undefined || date === null) {
    return null;
  }

  date = date.replace("T", " ");
  date = date.replace("+08:00", " ");
  return date;
}

export function getFormattedDateShort(date) {
  return date.slice(0, 10);
}

export function getShortName(s) {
  return s.split("/").slice(-1)[0];
}

export function getShortText(s, maxLength = 35) {
  if (!s) {
    return "";
  }
  if (s.length > maxLength) {
    return `${s.slice(0, maxLength)}...`;
  } else {
    return s;
  }
}

function getRandomInt(s) {
  let hash = 0;
  if (s.length !== 0) {
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
  }

  return hash;
}

export function getAvatarColor(s) {
  const colorList = ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae"];
  let random = getRandomInt(s);
  if (random < 0) {
    random = -random;
  }
  return colorList[random % 4];
}

export function getLanguage() {
  return i18next.language;
}

export function getProviderDisplayName(provider) {
  if (!provider) {
    return "";
  }
  const lang = getLanguage();
  const isEn = !lang || lang === "null" || lang === "en" || lang.startsWith("en-");
  if (!isEn) {
    const d2 = (provider.displayName2 || "").trim();
    if (d2) {
      return d2;
    }
  }
  const d1 = (provider.displayName || "").trim();
  if (d1) {
    return d1;
  }
  return provider.name || "";
}

export function setLanguage(language) {
  localStorage.setItem("language", language);
  i18next.changeLanguage(language);
}

export function setThemeColor(color) {
  localStorage.setItem("themeColor", color);
  updateTheme(color);
}

export function getThemeColor() {
  return localStorage.getItem("themeColor") ?? ThemeDefault.colorPrimary;
}

export function getAcceptLanguage() {
  if (i18next.language === null || i18next.language === "") {
    return "en;q=0.9,en;q=0.8";
  }
  return i18next.language + ";q=0.9,en;q=0.8";
}

export function getUrlParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

export function getTag(text, type, state) {
  let icon = null;
  let style = {};
  if (state === "Pending") {
    icon = <SyncOutlined spin />;
    style = {borderStyle: "dashed", backgroundColor: "white"};
  }

  if (type === "Read") {
    return (
      <Tooltip placement="top" title={i18next.t("store:Read")}>
        <Tag icon={icon} style={style} color={"success"}>
          {text}
        </Tag>
      </Tooltip>
    );
  } else if (type === "Write") {
    return (
      <Tooltip placement="top" title={i18next.t("store:Write")}>
        <Tag icon={icon} style={style} color={"processing"}>
          {text}
        </Tag>
      </Tooltip>
    );
  } else if (type === "Admin") {
    return (
      <Tooltip placement="top" title={i18next.t("general:Admin")}>
        <Tag icon={icon} style={style} color={"error"}>
          {text}
        </Tag>
      </Tooltip>
    );
  } else {
    return null;
  }
}

export function getRemarkTag(score) {
  let color;
  let text;
  if (score === "Excellent") {
    color = "success";
    text = i18next.t("video:Excellent");
  } else if (score === "Good") {
    color = "processing";
    text = i18next.t("video:Good");
  } else if (score === "Pass") {
    color = "warning";
    text = i18next.t("video:Pass");
  } else if (score === "Fail") {
    color = "error";
    text = i18next.t("video:Fail");
  } else {
    color = "default";
    text = `Unknown score: ${score}`;
  }

  return (
    <Tag style={{width: "60px", textAlign: "center"}} color={color}>
      {text}
    </Tag>
  );
}

export function getApplicationStatusTag(status) {
  let color;
  let translationKey;

  switch (status) {
  case "Running":
    color = "green";
    translationKey = i18next.t("application:Running");
    break;
  case "Pending":
    color = "orange";
    translationKey = i18next.t("application:Pending");
    break;
  case "Terminating":
    color = "orange";
    translationKey = i18next.t("application:Terminating");
    break;
  case "Failed":
    color = "red";
    translationKey = i18next.t("application:Failed");
    break;
  case "Not Deployed":
    color = "default";
    translationKey = i18next.t("application:Not Deployed");
    break;
  default:
    color = "default";
    translationKey = i18next.t("application:Unknown");
  }

  return (
    <Tag color={color}>
      {translationKey}
    </Tag>
  );
}

export function getLabelTags(labels) {
  if (!labels) {
    return [];
  }

  const res = [];
  labels.forEach((label, i) => {
    res.push(
      <Tooltip placement="top" title={getShortText(JSON.stringify(label.text), 500)}>
        <Tag color={"processing"}>
          {`${label.startTime}: ${label.text !== "" ? label.text : "(Empty)"}`}
        </Tag>
      </Tooltip>
    );
  });
  return res;
}

export function getPercentage(f) {
  if (f === undefined) {
    return 0.0;
  }

  return (100 * f).toFixed(1);
}

function s2ab(s) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i !== s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
}

export function workbook2blob(workbook) {
  const wopts = {
    bookType: "xlsx",
    bookSST: false,
    type: "binary",
  };
  const wbout = xlsx.write(workbook, wopts);
  return new Blob([s2ab(wbout)], {type: "application/octet-stream"});
}

export function sheet2blob(sheet, sheetName) {
  const workbook = {
    SheetNames: [sheetName],
    Sheets: {},
  };
  workbook.Sheets[sheetName] = sheet;
  return workbook2blob(workbook);
}

export function saveSheetToFile(sheet, sheetName, filename) {
  try {
    const blob = sheet2blob(sheet, sheetName);
    FileSaver.saveAs(blob, filename);
  } catch (error) {
    showMessage("error", `${i18next.t("general:Failed to save")}: ${error.message}`);
  }
}

export function json2sheet(data) {
  return xlsx.utils.json_to_sheet(data);
}

export function toggleElementFromSet(array, element) {
  if (!array) {
    array = [];
  }
  if (array.includes(element)) {
    return array.filter(e => e !== element);
  } else {
    return [...array, element];
  }
}

export function addElementToSet(set, newUser) {
  if (!set) {
    set = [];
  }
  if (!set.includes(newUser)) {
    set.push(newUser);
  }
  return set;
}

export function deleteElementFromSet(set, newUser) {
  if (!set) {
    return [];
  }
  return set.filter(user => user !== newUser);
}

export const redirectCatchJsonError = async(url) => {
  try {
    const response = await fetch(url);
    const data = await handleFetchResponse(response);
    if (response.ok) {
      this.props.history.push(url);
    } else {
      showMessage("error", `${i18next.t("general:Failed to redirect")}: ${(data && data.msg) || ""}`);
    }
  } catch (error) {
    showMessage("error", `${i18next.t("general:Failed to redirect")}: ${error.message}`);
  }
};

export function toFixed(f, n) {
  return parseFloat(f.toFixed(n));
}

export function getRandomName() {
  return Math.random().toString(36).slice(-6);
}

export function getFriendlyFileSize(size) {
  if (size < 1024) {
    return size + " B";
  }

  const i = Math.floor(Math.log(size) / Math.log(1024));
  let num = (size / Math.pow(1024, i));
  const round = Math.round(num);
  num = round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round;
  return `${num} ${"KMGTPEZY"[i - 1]}B`;
}

export function getTreeWithParents(tree) {
  const res = deepCopy(tree);
  res.children = tree.children.map((file, index) => {
    file.parent = tree;
    return getTreeWithParents(file);
  });
  return res;
}

export function getTreeWithSearch(tree, s) {
  const res = deepCopy(tree);
  res.children = tree.children.map((file, index) => {
    if (file.children.length === 0) {
      if (file.title.includes(s)) {
        return file;
      } else {
        return null;
      }
    } else {
      const tmpTree = getTreeWithSearch(file, s);
      if (tmpTree.children.length !== 0) {
        return tmpTree;
      } else {
        if (file.title.includes(s)) {
          return file;
        } else {
          return null;
        }
      }
    }
  }).filter((file, index) => {
    return file !== null;
  });
  return res;
}

export function getExtFromPath(path) {
  const filename = path.split("/").pop();
  if (filename.includes(".")) {
    return filename.split(".").pop().toLowerCase();
  } else {
    return "";
  }
}

export function getFileIconType(filename) {
  if (!filename) {
    return "icon-testdocument";
  }
  const ext = getExtFromPath(filename);
  if (ext === "pdf") {
    return "icon-testpdf";
  } else if (ext === "doc" || ext === "docx") {
    return "icon-testdocx";
  } else if (ext === "ppt" || ext === "pptx") {
    return "icon-testpptx";
  } else if (ext === "xls" || ext === "xlsx") {
    return "icon-testxlsx";
  } else if (ext === "txt") {
    return "icon-testdocument";
  } else if (ext === "png" || ext === "bmp" || ext === "jpg" || ext === "jpeg" || ext === "svg") {
    return "icon-testPicture";
  } else if (ext === "html") {
    return "icon-testhtml";
  } else if (ext === "js") {
    return "icon-testjs";
  } else if (ext === "css") {
    return "icon-testcss";
  } else {
    return "icon-testfile-unknown";
  }
}

export function getExtFromFile(file) {
  const res = file.title.split(".")[1];
  if (res === undefined) {
    return "";
  } else {
    return res;
  }
}

export function getFileCategory(file) {
  if (file.isLeaf) {
    return i18next.t("store:File");
  } else {
    return i18next.t("store:Folder");
  }
}

export function getDistinctArray(arr) {
  return [...new Set(arr)];
}

export function getCollectedTime(filename) {
  // 20220827_210300_CH~Logo.png
  const tokens = filename.split("~");
  if (tokens.length < 2) {
    return null;
  }

  const time = tokens[0].slice(0, -3);
  const m = new moment(time, "YYYYMMDD_HH:mm:ss");
  return m.format();
}

export function getSubject(filename) {
  // 20220827_210300_CH~Logo.png
  const tokens = filename.split("~");
  if (tokens.length < 2) {
    return null;
  }

  const subject = tokens[0].slice(tokens[0].length - 2);
  if (subject === "MA") {
    return i18next.t("store:Math");
  } else if (subject === "CH") {
    return i18next.t("store:Chinese");
  } else if (subject === "NU") {
    return null;
  } else {
    return subject;
  }
}

export function submitStoreEdit(storeObj) {
  const store = deepCopy(storeObj);
  store.fileTree = undefined;
  StoreBackend.updateStore(storeObj.owner, storeObj.name, store)
    .then((res) => {
      if (res.status === "ok") {
        if (res.data) {
          showMessage("success", i18next.t("general:Successfully saved"));
        } else {
          showMessage("error", i18next.t("general:Failed to save"));
        }
      } else {
        showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    })
    .catch(error => {
      showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
    });
}

export function getDefaultAiAvatar() {
  return `${StaticBaseUrl}/img/openagent.png`;
}

export const Countries = [
  {label: "English", key: "en", country: "US", alt: "English"},
  {label: "中文", key: "zh", country: "CN", alt: "中文"},
];

export function getOtherProviderInfo() {
  const res = {
    Model: {
      "OpenAI": {
        logo: `${StaticBaseUrl}/img/social_openai.svg`,
        url: "https://platform.openai.com",
      },
      "OpenAI Compatible": {
        logo: `${StaticBaseUrl}/img/social_openai.svg`,
        url: "https://platform.openai.com",
      },
      "Gemini": {
        logo: `${StaticBaseUrl}/img/social_gemini.png`,
        url: "https://gemini.google.com/",
      },
      "Hugging Face": {
        logo: `${StaticBaseUrl}/img/social_huggingface.png`,
        url: "https://huggingface.co/",
      },
      "Claude": {
        logo: `${StaticBaseUrl}/img/social_claude.png`,
        url: "https://www.anthropic.com/claude",
      },
      "Grok": {
        logo: `${StaticBaseUrl}/img/social_xai.png`,
        url: "https://x.ai/",
      },
      "OpenRouter": {
        logo: `${StaticBaseUrl}/img/social_openrouter.png`,
        url: "https://openrouter.ai/",
      },
      "Baidu Cloud": {
        logo: `${StaticBaseUrl}/img/social_baidu_cloud.png`,
        url: "https://cloud.baidu.com/",
      },
      "iFlytek": {
        logo: `${StaticBaseUrl}/img/social_iflytek.png`,
        url: "https://www.iflytek.com/",
      },
      "ChatGLM": {
        logo: `${StaticBaseUrl}/img/social_chatglm.png`,
        url: "https://chatglm.cn/",
      },
      "MiniMax": {
        logo: `${StaticBaseUrl}/img/social_minimax.png`,
        url: "https://www.minimax.dev/",
      },
      "Ollama": {
        logo: `${StaticBaseUrl}/img/social_ollama.png`,
        url: "https://ollama.ai/",
      },
      "Local": {
        logo: `${StaticBaseUrl}/img/social_local.jpg`,
        url: "",
      },
      "Azure": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/",
      },
      "Cohere": {
        logo: `${StaticBaseUrl}/img/social_cohere.png`,
        url: "https://cohere.ai/",
      },
      "Moonshot": {
        logo: `${StaticBaseUrl}/img/social_moonshot.png`,
        url: "https://www.moonshot.cn/",
      },
      "Amazon Bedrock": {
        logo: `${StaticBaseUrl}/img/social_aws.png`,
        url: "https://aws.amazon.com/bedrock/",
      },
      "Dummy": {
        logo: `${StaticBaseUrl}/img/social_default.png`,
        url: "",
      },
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
      "Baichuan": {
        logo: `${StaticBaseUrl}/img/social_baichuan-color.png`,
        url: "https://www.baichuan-ai.com/",
      },
      "Volcano Engine": {
        logo: `${StaticBaseUrl}/img/social_volc_engine.jpg`,
        url: "https://www.volcengine.com/",
      },
      "DeepSeek": {
        logo: `${StaticBaseUrl}/img/social_deepseek.png`,
        url: "https://www.deepseek.com/",
      },
      "StepFun": {
        logo: `${StaticBaseUrl}/img/social_stepfun.png`,
        url: "https://www.stepfun.com/",
      },
      "Tencent Cloud": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/",
      },
      "Yi": {
        logo: `${StaticBaseUrl}/img/social_yi.png`,
        url: "https://01.ai/",
      },
      "Silicon Flow": {
        logo: `${StaticBaseUrl}/img/social_silicon_flow.png`,
        url: "https://www.siliconflow.com/",
      },
      "GitHub": {
        logo: `${StaticBaseUrl}/img/social_github.png`,
        url: "https://github.com/",
      },
      "Writer": {
        logo: `${StaticBaseUrl}/img/social_writer.png`,
        url: "https://writer.com/",
      },
    },
    Embedding: {
      "OpenAI": {
        logo: `${StaticBaseUrl}/img/social_openai.svg`,
        url: "https://platform.openai.com",
      },
      "Gemini": {
        logo: `${StaticBaseUrl}/img/social_gemini.png`,
        url: "https://gemini.google.com/",
      },
      "Hugging Face": {
        logo: `${StaticBaseUrl}/img/social_huggingface.png`,
        url: "https://huggingface.co/",
      },
      "Cohere": {
        logo: `${StaticBaseUrl}/img/social_cohere.png`,
        url: "https://cohere.ai/",
      },
      "Baidu Cloud": {
        logo: `${StaticBaseUrl}/img/social_baidu_cloud.png`,
        url: "https://cloud.baidu.com/",
      },
      "Ollama": {
        logo: `${StaticBaseUrl}/img/social_ollama.png`,
        url: "https://ollama.ai/",
      },
      "Local": {
        logo: `${StaticBaseUrl}/img/social_local.jpg`,
        url: "",
      },
      "Azure": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/",
      },
      "MiniMax": {
        logo: `${StaticBaseUrl}/img/social_minimax.png`,
        url: "https://www.minimax.dev/",
      },
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
      "Tencent Cloud": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/",
      },
      "Jina": {
        logo: `${StaticBaseUrl}/img/social_jina.png`,
        url: "https://jina.ai/",
      },
      "Word2Vec": {
        logo: `${StaticBaseUrl}/img/social_local.jpg`,
        url: "",
      },
      "Dummy": {
        logo: `${StaticBaseUrl}/img/social_default.png`,
        url: "",
      },
    },
    Storage: {
      "Local File System": {
        logo: `${StaticBaseUrl}/img/social_file.png`,
        url: "",
      },
      "AWS S3": {
        logo: `${StaticBaseUrl}/img/social_aws.png`,
        url: "https://aws.amazon.com/s3",
      },
      "MinIO": {
        logo: "https://min.io/resources/img/logo.svg",
        url: "https://min.io/",
      },
      "Aliyun OSS": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://aliyun.com/product/oss",
      },
      "Tencent Cloud COS": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/product/cos",
      },
      "Azure Blob": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/en-us/services/storage/blobs/",
      },
      "Qiniu Cloud Kodo": {
        logo: `${StaticBaseUrl}/img/social_qiniu_cloud.png`,
        url: "https://www.qiniu.com/solutions/storage",
      },
      "Google Cloud Storage": {
        logo: `${StaticBaseUrl}/img/social_google_cloud.png`,
        url: "https://cloud.google.com/storage",
      },
      "Synology": {
        logo: `${StaticBaseUrl}/img/social_synology.png`,
        url: "https://www.synology.com/en-global/dsm/feature/file_sharing",
      },
      "Casdoor": {
        logo: `${StaticBaseUrl}/img/casdoor.png`,
        url: "https://casdoor.org/docs/provider/storage/overview",
      },
      "CUCloud OSS": {
        logo: `${StaticBaseUrl}/img/social_cucloud.png`,
        url: "https://www.cucloud.cn/product/oss.html",
      },
      "OpenAI File System": {
        logo: `${StaticBaseUrl}/img/social_openai.svg`,
        url: "https://platform.openai.com",
      },
    },
    Blockchain: {
      "Hyperledger Fabric": {
        logo: `${StaticBaseUrl}/img/social_hyperledger.png`,
        url: "https://www.hyperledger.org/use/fabric",
      },
      "ChainMaker": {
        logo: `${StaticBaseUrl}/img/social_chainmaker.jpg`,
        url: "https://chainmaker.org.cn/",
      },
      "Tencent ChainMaker": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/product/tcm",
      },
      "Tencent ChainMaker (Demo Network)": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/product/tcm",
      },
      "Ethereum": {
        logo: `${StaticBaseUrl}/img/social_ethereum.png`,
        url: "https://ethereum.org/en/",
      },
    },
    Video: {
      "AWS": {
        logo: `${StaticBaseUrl}/img/social_aws.png`,
        url: "https://aws.amazon.com/",
      },
      "Azure": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/",
      },
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
    },
    Agent: {
      "MCP": {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://modelcontextprotocol.io/",
      },
      "A2A": {
        logo: `${StaticBaseUrl}/img/social_a2a.png`,
        url: "https://agent2agent.info/",
      },
    },
    Tool: {
      time: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      web_search: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      shell: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      office: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      web_fetch: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      web_browser: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      gui: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32",
      },
      video_download: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/yt-dlp/yt-dlp",
      },
      browser_use: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
    },
    "Public Cloud": {
      "Aliyun": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
      "Amazon Web Services": {
        logo: `${StaticBaseUrl}/img/social_aws.png`,
        url: "https://aws.amazon.com/",
      },
      "Azure": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/",
      },
      "Google Cloud": {
        logo: `${StaticBaseUrl}/img/social_google_cloud.png`,
        url: "https://cloud.google.com/",
      },
      "Tencent Cloud": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/",
      },
    },
    "Private Cloud": {
      "KVM": {
        logo: `${StaticBaseUrl}/img/social_kvm.png`,
        url: "https://www.linux-kvm.org/",
      },
      "Xen": {
        logo: `${StaticBaseUrl}/img/social_xen.png`,
        url: "https://xenproject.org/",
      },
      "VMware": {
        logo: `${StaticBaseUrl}/img/social_vmware.png`,
        url: "https://www.vmware.com/",
      },
      "PVE": {
        logo: `${StaticBaseUrl}/img/social_pve.png`,
        url: "https://www.proxmox.com/",
      },
      "Kubernetes": {
        logo: `${StaticBaseUrl}/img/social_kubernetes.png`,
        url: "https://kubernetes.io/",
      },
      "Docker": {
        logo: `${StaticBaseUrl}/img/social_docker.png`,
        url: "https://www.docker.com/",
      },
    },
    "Text-to-Speech": {
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
    },
    "Speech-to-Text": {
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
    },
    "Bot": {
      "Tencent": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/",
      },
    },
    "Chat": {
      "Telegram": {
        logo: `${StaticBaseUrl}/img/social_telegram.png`,
        url: "https://telegram.org/",
      },
    },
    "Scan": {
      "Nmap": {
        logo: `${StaticBaseUrl}/img/social_nmap.png`,
        url: "https://nmap.org/",
      },
      "OS Patch": {
        // Note: social_windows.png should be added to the img/ directory
        logo: `${StaticBaseUrl}/img/social_windows.png`,
        url: "https://learn.microsoft.com/en-us/windows/deployment/update/",
      },
      "Nuclei": {
        logo: `${StaticBaseUrl}/img/social_nuclei.png`,
        url: "https://github.com/projectdiscovery/nuclei",
      },
      "ZAP": {
        logo: `${StaticBaseUrl}/img/social_zap.png`,
        url: "https://github.com/zaproxy/zaproxy",
      },
      "Subfinder": {
        logo: `${StaticBaseUrl}/img/social_subfinder.png`,
        url: "https://github.com/projectdiscovery/subfinder",
      },
      "httpx": {
        logo: `${StaticBaseUrl}/img/social_httpx.png`,
        url: "https://github.com/projectdiscovery/httpx",
      },
    },
  };

  return res;
}

export function getAssetTypeIcons() {
  return {
    "VPC": `${StaticBaseUrl}/img/cloud/vpc.png`,
    "VSwitch": `${StaticBaseUrl}/img/cloud/vswitch.png`,
    "Network Interface": `${StaticBaseUrl}/img/cloud/network.png`,
    "Security Group": `${StaticBaseUrl}/img/cloud/securitygroup.png`,
    "Virtual Machine": `${StaticBaseUrl}/img/cloud/vm.png`,
    "Disk": `${StaticBaseUrl}/img/cloud/disk.png`,
    "Snapshot": `${StaticBaseUrl}/img/cloud/snapshot.png`,
    "Image": `${StaticBaseUrl}/img/cloud/image.png`,
    "Snapshot Policy": `${StaticBaseUrl}/img/cloud/policy.png`,
  };
}

export function getItem(label, key, icon, children, type) {
  return {
    key,
    icon,
    children,
    label,
    type,
  };
}

export function getOption(label, value) {
  return {
    label,
    value,
  };
}

export function scrollToDiv(divId) {
  if (divId) {
    const ele = document.getElementById(divId);
    if (ele) {
      ele.scrollIntoView({behavior: "smooth"});
    }
  }
}

export function renderExternalLink() {
  return (
    <svg style={{marginLeft: "5px"}} width="13.5" height="13.5" aria-hidden="true" viewBox="0 0 24 24" className="iconExternalLink_nPIU">
      <path fill="currentColor"
        d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"></path>
    </svg>
  );
}

export function isResponseDenied(data) {
  return data.msg === "Unauthorized operation" || data.msg === "this operation requires admin privilege";
}

export function getCompatibleProviderOptions(category) {
  if (category === "Model") {
    return (
      [
        // GPT-5.4 series (latest)
        {"id": "gpt-5.4", "name": "gpt-5.4"},
        {"id": "gpt-5.4-pro", "name": "gpt-5.4-pro"},
        {"id": "gpt-5.4-mini", "name": "gpt-5.4-mini"},
        {"id": "gpt-5.4-nano", "name": "gpt-5.4-nano"},
        // GPT-5.3 series
        {"id": "gpt-5.3-codex", "name": "gpt-5.3-codex"},
        {"id": "gpt-5.3-chat", "name": "gpt-5.3-chat"},
        // GPT-5.2 series
        {"id": "gpt-5.2", "name": "gpt-5.2"},
        // GPT-5.1 series
        {"id": "gpt-5.1", "name": "gpt-5.1"},
        // GPT-5 series
        {"id": "gpt-5", "name": "gpt-5"},
        {"id": "gpt-5-mini", "name": "gpt-5-mini"},
        {"id": "gpt-5-nano", "name": "gpt-5-nano"},
        {"id": "gpt-5-chat", "name": "gpt-5-chat"},
        {"id": "gpt-5-pro", "name": "gpt-5-pro"},
        // o-series (latest first)
        {"id": "o4-mini", "name": "o4-mini"},
        {"id": "codex-mini", "name": "codex-mini"},
        {"id": "o3-pro", "name": "o3-pro"},
        {"id": "o3", "name": "o3"},
        {"id": "o3-mini", "name": "o3-mini"},
        {"id": "o1-pro", "name": "o1-pro"},
        {"id": "o1", "name": "o1"},
        // GPT-4.1 series
        {"id": "gpt-4.1", "name": "gpt-4.1"},
        {"id": "gpt-4.1-mini", "name": "gpt-4.1-mini"},
        {"id": "gpt-4.1-nano", "name": "gpt-4.1-nano"},
        // GPT-4.5 / GPT-4o series
        {"id": "gpt-4.5", "name": "gpt-4.5"},
        {"id": "gpt-4o", "name": "gpt-4o"},
        {"id": "gpt-4o-2024-08-06", "name": "gpt-4o-2024-08-06"},
        {"id": "gpt-4o-mini", "name": "gpt-4o-mini"},
        {"id": "gpt-4o-mini-2024-07-18", "name": "gpt-4o-mini-2024-07-18"},
        // GPT-4 series (legacy)
        {"id": "gpt-4-turbo", "name": "gpt-4-turbo"},
        {"id": "gpt-4", "name": "gpt-4"},
        // GPT-3.5 (legacy)
        {"id": "gpt-3.5-turbo", "name": "gpt-3.5-turbo"},
      ]
    );
  } else if (category === "Embedding") {
    return (
      [
        {id: "text-embedding-ada-002", name: "text-embedding-ada-002"},
        {id: "text-embedding-3-small", name: "text-embedding-3-small"},
        {id: "text-embedding-3-large", name: "text-embedding-3-large"},
      ]
    );
  }
}

export function getProviderLogoURL(provider) {
  const otherProviderInfo = getOtherProviderInfo();
  if (!provider || !otherProviderInfo[provider.category] || !otherProviderInfo[provider.category][provider.type]) {
    return "";
  }

  return otherProviderInfo[provider.category][provider.type].logo;
}

export function isProviderSupportWebSearch(provider) {
  if (!provider || provider.category !== "Model") {
    return false;
  }

  if (provider.type === "OpenAI") {
    return true;
  }

  if (provider.type === "Alibaba Cloud") {
    // Wanxiang image generation models do not support web search
    if (provider.subType && provider.subType.startsWith("wanx")) {
      return false;
    }

    if (!provider.subType) {
      return true; // Default to true for Alibaba Cloud if subType is not specified
    }

    return true;
  }

  return false;
}

export function getProviderTypeOptions(category) {
  if (category === "Storage") {
    return (
      [
        {id: "Local File System", name: "Local File System"},
        {id: "OpenAI File System", name: "OpenAI File System"},
      ]
    );
  } else if (category === "Model") {
    return (
      [
        {id: "OpenAI", name: "OpenAI"},
        {id: "OpenAI Compatible", name: "OpenAI Compatible"},
        {id: "Gemini", name: "Gemini"},
        {id: "Hugging Face", name: "Hugging Face"},
        {id: "Claude", name: "Claude"},
        {id: "Grok", name: "Grok"},
        {id: "OpenRouter", name: "OpenRouter"},
        {id: "Baidu Cloud", name: "Baidu Cloud"},
        {id: "iFlytek", name: "iFlytek"},
        {id: "ChatGLM", name: "ChatGLM"},
        {id: "MiniMax", name: "MiniMax"},
        {id: "Ollama", name: "Ollama"},
        {id: "Local", name: "Local"},
        {id: "Azure", name: "Azure"},
        {id: "Cohere", name: "Cohere"},
        {id: "Moonshot", name: "Moonshot"},
        {id: "Amazon Bedrock", name: "Amazon Bedrock"},
        {id: "Dummy", name: "Dummy"},
        {id: "Alibaba Cloud", name: "Alibaba Cloud"},
        {id: "Baichuan", name: "Baichuan"},
        {id: "Volcano Engine", name: "Volcano Engine"},
        {id: "DeepSeek", name: "DeepSeek"},
        {id: "StepFun", name: "StepFun"},
        {id: "Tencent Cloud", name: "Tencent Cloud"},
        {id: "Yi", name: "Yi"},
        {id: "Silicon Flow", name: "Silicon Flow"},
        {id: "GitHub", name: "GitHub"},
        {id: "Writer", name: "Writer"},
      ]
    );
  } else if (category === "Embedding") {
    return (
      [
        {id: "OpenAI", name: "OpenAI"},
        {id: "Gemini", name: "Gemini"},
        {id: "Hugging Face", name: "Hugging Face"},
        {id: "Cohere", name: "Cohere"},
        {id: "Baidu Cloud", name: "Baidu Cloud"},
        {id: "Ollama", name: "Ollama"},
        {id: "Local", name: "Local"},
        {id: "Azure", name: "Azure"},
        {id: "MiniMax", name: "MiniMax"},
        {id: "Alibaba Cloud", name: "Alibaba Cloud"},
        {id: "Tencent Cloud", name: "Tencent Cloud"},
        {id: "Jina", name: "Jina"},
        {id: "Word2Vec", name: "Word2Vec"},
        {id: "Dummy", name: "Dummy"},
      ]
    );
  } else if (category === "Agent") {
    return ([
      {id: "MCP", name: "MCP"},
      {id: "A2A", name: "A2A"},
    ]);
  } else if (category === "Tool") {
    return [
      {id: "time", name: "time"},
      {id: "web_search", name: "web_search"},
      {id: "shell", name: "shell"},
      {id: "office", name: "office"},
      {id: "web_fetch", name: "web_fetch"},
      {id: "web_browser", name: "web_browser"},
      {id: "gui", name: "gui"},
      {id: "video_download", name: "video_download"},
      {id: "browser_use", name: "browser_use"},
    ];
  } else if (category === "Public Cloud") {
    return ([
      {id: "Amazon Web Services", name: "Amazon Web Services"},
      {id: "Azure", name: "Azure"},
      {id: "Google Cloud", name: "Google Cloud"},
      {id: "Aliyun", name: "Aliyun"},
      {id: "Tencent Cloud", name: "Tencent Cloud"},
    ]);
  } else if (category === "Private Cloud") {
    return ([
      {id: "KVM", name: "KVM"},
      {id: "Xen", name: "Xen"},
      {id: "VMware", name: "VMware"},
      {id: "PVE", name: "PVE"},
      {id: "Kubernetes", name: "Kubernetes"},
      {id: "Docker", name: "Docker"},
    ]);
  } else if (category === "Blockchain") {
    return ([
      {id: "Hyperledger Fabric", name: "Hyperledger Fabric"},
      {id: "ChainMaker", name: "ChainMaker"},
      {id: "Tencent ChainMaker", name: "Tencent ChainMaker"},
      {id: "Tencent ChainMaker (Demo Network)", name: "Tencent ChainMaker (Demo Network)"},
      {id: "Ethereum", name: "Ethereum"},
    ]);
  } else if (category === "Video") {
    return (
      [
        {id: "AWS", name: "AWS"},
        {id: "Azure", name: "Azure"},
        {id: "Alibaba Cloud", name: "Alibaba Cloud"},
      ]
    );
  } else if (category === "Text-to-Speech") {
    return [
      {id: "Alibaba Cloud", name: "Alibaba Cloud"},
    ];
  } else if (category === "Speech-to-Text") {
    return [
      {id: "Alibaba Cloud", name: "Alibaba Cloud"},
    ];
  } else if (category === "Bot") {
    return [
      {id: "Tencent", name: "Tencent"},
    ];
  } else if (category === "Chat") {
    return [
      {id: "Telegram", name: "Telegram"},
    ];
  } else if (category === "Scan") {
    return [
      {id: "Nmap", name: "Nmap"},
      {id: "OS Patch", name: "OS Patch"},
      {id: "Nuclei", name: "Nuclei"},
      {id: "ZAP", name: "ZAP"},
      {id: "Subfinder", name: "Subfinder"},
      {id: "httpx", name: "httpx"},
    ];
  } else {
    return [];
  }
}

export function redirectToLogin() {
  sessionStorage.setItem("from", window.location.pathname);
  window.location.replace(getSigninUrl());
  return null;
}

const openaiModels = [
  // GPT-5.4 series (latest)
  {id: "gpt-5.4", name: "gpt-5.4"},
  {id: "gpt-5.4-pro", name: "gpt-5.4-pro"},
  {id: "gpt-5.4-mini", name: "gpt-5.4-mini"},
  {id: "gpt-5.4-nano", name: "gpt-5.4-nano"},
  // GPT-5.3 series
  {id: "gpt-5.3-codex", name: "gpt-5.3-codex"},
  {id: "gpt-5.3-chat", name: "gpt-5.3-chat"},
  // GPT-5.2 series
  {id: "gpt-5.2", name: "gpt-5.2"},
  {id: "gpt-5.2-chat", name: "gpt-5.2-chat"},
  {id: "gpt-5.2-codex", name: "gpt-5.2-codex"},
  // GPT-5.1 series
  {id: "gpt-5.1", name: "gpt-5.1"},
  {id: "gpt-5.1-chat", name: "gpt-5.1-chat"},
  {id: "gpt-5.1-codex", name: "gpt-5.1-codex"},
  {id: "gpt-5.1-codex-mini", name: "gpt-5.1-codex-mini"},
  {id: "gpt-5.1-codex-max", name: "gpt-5.1-codex-max"},
  // GPT-5 series
  {id: "gpt-5", name: "gpt-5"},
  {id: "gpt-5-mini", name: "gpt-5-mini"},
  {id: "gpt-5-nano", name: "gpt-5-nano"},
  {id: "gpt-5-chat", name: "gpt-5-chat"},
  {id: "gpt-5-codex", name: "gpt-5-codex"},
  {id: "gpt-5-pro", name: "gpt-5-pro"},
  // o-series reasoning models (latest first)
  {id: "o4-mini", name: "o4-mini"},
  {id: "codex-mini", name: "codex-mini"},
  {id: "o3-pro", name: "o3-pro"},
  {id: "o3", name: "o3"},
  {id: "o3-mini", name: "o3-mini"},
  {id: "o1-pro", name: "o1-pro"},
  {id: "o1", name: "o1"},
  {id: "o1-preview", name: "o1-preview"},
  {id: "o1-mini", name: "o1-mini"},
  // GPT-4.1 series
  {id: "gpt-4.1", name: "gpt-4.1"},
  {id: "gpt-4.1-mini", name: "gpt-4.1-mini"},
  {id: "gpt-4.1-nano", name: "gpt-4.1-nano"},
  // GPT-4.5 / GPT-4o series
  {id: "gpt-4.5", name: "gpt-4.5"},
  {id: "gpt-4o", name: "gpt-4o"},
  {id: "gpt-4o-2024-08-06", name: "gpt-4o-2024-08-06"},
  {id: "gpt-4o-mini", name: "gpt-4o-mini"},
  {id: "gpt-4o-mini-2024-07-18", name: "gpt-4o-mini-2024-07-18"},
  // GPT-4 series (legacy)
  {id: "gpt-4-turbo", name: "gpt-4-turbo"},
  {id: "gpt-4", name: "gpt-4"},
  // Specialized / open-weight
  {id: "computer-use-preview", name: "computer-use-preview"},
  {id: "gpt-oss-120b", name: "gpt-oss-120b"},
  {id: "gpt-oss-20b", name: "gpt-oss-20b"},
  // GPT-3.5 (legacy)
  {id: "gpt-3.5-turbo", name: "gpt-3.5-turbo"},
  // Image generation models (latest first)
  {id: "gpt-image-2", name: "gpt-image-2"},
  {id: "gpt-image-1.5", name: "gpt-image-1.5"},
  {id: "gpt-image-1", name: "gpt-image-1"},
  {id: "gpt-image-1-mini", name: "gpt-image-1-mini"},
  {id: "dall-e-3", name: "dall-e-3"},
  {id: "dall-e-2", name: "dall-e-2"},
  // Other
  {id: "deep-research", name: "deep-research"},
];

const openaiEmbeddings = [
  {id: "text-embedding-ada-002", name: "text-embedding-ada-002"},
  {id: "text-embedding-3-small", name: "text-embedding-3-small"},
  {id: "text-embedding-3-large", name: "text-embedding-3-large"},
];

export function getTtsFlavorOptions(type, subType) {
  if (type === "Alibaba Cloud" && subType === "cosyvoice-v1") {
    return [
      {id: "longwan", name: "龙婉，女，中文普通话。龙婉声音温柔甜美，富有亲和力，给人温暖陪伴感。"},
      {id: "longcheng", name: "龙橙，男，中文普通话。龙橙声音温柔清澈，富有亲和力，是邻家的温暖大哥哥。"},
      {id: "longhua", name: "龙华，女童，中文普通话。龙华声音活泼可爱，有趣生动，是孩子们的好朋友。"},
      {id: "longxiaochun", name: "龙小淳，女，中英双语。龙小淳的嗓音如丝般柔滑，温暖中流淌着亲切与抚慰，恰似春风吹过心田。"},
      {id: "longxiaoxia", name: "龙小夏，女，中文普通话。龙小夏以温润磁性的声线，宛如夏日细雨，悄然滋润听者心灵，营造恬静氛围。"},
      {id: "longxiaocheng", name: "龙小诚，男，中英双语。龙小诚深邃而稳重的嗓音，犹如醇厚佳酿，散发出成熟魅力。"},
      {id: "longxiaobai", name: "龙小白，女，中文普通话。龙小白以轻松亲和的声调，演绎闲适日常，其嗓音如邻家女孩般亲切自然。"},
      {id: "longlaotie", name: "龙老铁，男，东北口音。龙老铁以纯正东北腔，豪爽直率，幽默风趣，为讲述增添浓郁地方特色与生活气息。"},
      {id: "longshu", name: "龙书，男，中文普通话。龙书以专业、沉稳的播报风格，传递新闻资讯，其嗓音富含权威与信赖感。"},
      {id: "longjing", name: "龙婧，女，中文普通话。龙婧的嗓音庄重而凛然，精准传达严肃主题，赋予话语以权威与力量。"},
      {id: "longmiao", name: "龙妙，女，中文普通话。龙妙声音清澈透亮，优雅如泉水叮咚，赋予朗诵空灵之美，令人陶醉其中。"},
      {id: "longyue", name: "龙悦，女，中文普通话。龙悦以抑扬顿挫、韵味十足的评书腔调，生动讲述故事，引领听众步入传奇世界！"},
      {id: "longyuan", name: "龙媛，女，中文普通话。龙媛以细腻入微、情感丰富的嗓音，将小说人物与情节娓娓道来，引人入胜。"},
      {id: "longfei", name: "龙飞，男，中文普通话。龙飞以冷静而睿智的声线，如高山上的清泉，经久流长，透出庄严的宁静。"},
      {id: "longjielidou", name: "龙杰力豆，儿童，中英双语。龙杰力豆以和煦如春阳的童声娓娓道来，透出了欣欣向荣的生命力，温暖每一个倾听的耳朵。"},
      {id: "longshuo", name: "龙硕，男，中文普通话。龙硕嗓音充满活力与阳光，如暖阳照耀，增添无限正能量，使人精神焕发。"},
      {id: "longtong", name: "龙彤，儿童，中文普通话。龙彤以稚嫩的童声撒欢，像是春日里的小溪，清脆跳跃，流淌着生机勃勃的旋律。"},
      {id: "longxiang", name: "龙祥，男，中文普通话。龙祥以稳如老茶的沉着和淡然，仿佛时光在其声音中慢慢沉淀，让心灵得以安放。"},
      {id: "loongstella", name: "Stella2.0，女，中英双语。Stella2.0以其飒爽利落的嗓音，演绎独立女性风采，展现坚韧与力量之美。"},
      {id: "loongbella", name: "Bella2.0，女，中文普通话。Bella2.0以精准干练的播报风格，传递全球资讯，其专业女声犹如新闻现场的引导者。"},
    ];
  }

  return [];
}

export function getModelSubTypeOptions(type) {
  if (type === "OpenAI" || type === "Azure" || type === "OpenAI Compatible") {
    return openaiModels;
  } else if (type === "Gemini") {
    return [
      // Gemini 3.1 series (Preview)
      {id: "gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview"},
      {id: "gemini-3.1-pro-preview-customtools", name: "gemini-3.1-pro-preview-customtools"},
      {id: "gemini-3.1-flash-lite-preview", name: "gemini-3.1-flash-lite-preview"},
      {id: "gemini-3.1-flash-live-preview", name: "gemini-3.1-flash-live-preview"},
      {id: "gemini-3.1-flash-image-preview", name: "gemini-3.1-flash-image-preview"},
      // Gemini 3 series (Preview)
      {id: "gemini-3-flash-preview", name: "gemini-3-flash-preview"},
      {id: "gemini-3-pro-image-preview", name: "gemini-3-pro-image-preview"},
      // Gemini 2.5 series (Stable)
      {id: "gemini-2.5-pro", name: "gemini-2.5-pro"},
      {id: "gemini-2.5-flash", name: "gemini-2.5-flash"},
      {id: "gemini-2.5-flash-lite", name: "gemini-2.5-flash-lite"},
      // Gemini 2.5 series (Preview)
      {id: "gemini-2.5-flash-lite-preview-09-2025", name: "gemini-2.5-flash-lite-preview-09-2025"},
      {id: "gemini-2.5-flash-native-audio-preview-12-2025", name: "gemini-2.5-flash-native-audio-preview-12-2025"},
      {id: "gemini-2.5-flash-image", name: "gemini-2.5-flash-image"},
      {id: "gemini-2.5-flash-preview-tts", name: "gemini-2.5-flash-preview-tts"},
      {id: "gemini-2.5-pro-preview-tts", name: "gemini-2.5-pro-preview-tts"},
      {id: "gemini-2.5-computer-use-preview-10-2025", name: "gemini-2.5-computer-use-preview-10-2025"},
      // Gemini 2.0 series (Deprecated, shut down June 1, 2026)
      {id: "gemini-2.0-flash", name: "gemini-2.0-flash"},
      {id: "gemini-2.0-flash-001", name: "gemini-2.0-flash-001"},
      {id: "gemini-2.0-flash-lite", name: "gemini-2.0-flash-lite"},
      {id: "gemini-2.0-flash-lite-001", name: "gemini-2.0-flash-lite-001"},
      // Embedding models
      {id: "gemini-embedding-2-preview", name: "gemini-embedding-2-preview"},
      {id: "gemini-embedding-001", name: "gemini-embedding-001"},
      // Specialized models
      {id: "gemini-robotics-er-1.5-preview", name: "gemini-robotics-er-1.5-preview"},
      // Gemma 4
      {id: "gemma-4", name: "gemma-4"},
      // Image generation models
      {id: "imagen-4.0-generate-001", name: "imagen-4.0-generate-001"},
      {id: "imagen-4.0-ultra-generate-001", name: "imagen-4.0-ultra-generate-001"},
      {id: "imagen-4.0-fast-generate-001", name: "imagen-4.0-fast-generate-001"},
      // Video generation models
      {id: "veo-3.1-generate-preview", name: "veo-3.1-generate-preview"},
      {id: "veo-3.1-fast-generate-preview", name: "veo-3.1-fast-generate-preview"},
      {id: "veo-3.1-lite-generate-preview", name: "veo-3.1-lite-generate-preview"},
      {id: "veo-3.0-generate-001", name: "veo-3.0-generate-001"},
      {id: "veo-3.0-fast-generate-001", name: "veo-3.0-fast-generate-001"},
      {id: "veo-2.0-generate-001", name: "veo-2.0-generate-001"},
    ];
  } else if (type === "GitHub") {
    return [
      {id: "gpt-4o", name: "GPT-4o"},
      {id: "gpt-4o-mini", name: "GPT-4o-mini"},
      {id: "Phi-4-multimodal-instruct", name: "Phi-4-multimodal-instruct"},
      {id: "Phi-4-mini-instruct", name: "Phi-4-mini-instruct"},
      {id: "Phi-4", name: "Phi-4"},
      {id: "Mistral-Large-2411", name: "Mistral-Large-2411"},
      {id: "AI21-Jamba-1.5-Large", name: "AI21-Jamba-1.5-Large"},
      {id: "AI21-Jamba-1.5-Mini", name: "AI21-Jamba-1.5-Mini"},
      {id: "Cohere-command-r-08-2024", name: "Cohere-command-r-08-2024"},
      {id: "Cohere-command-r-plus-08-2024", name: "Cohere-command-r-plus-08-2024"},
      {id: "Llama-3.3-70B-Instruct", name: "Llama-3.3-70B-Instruct"},
    ];
  } else if (type === "Hugging Face") {
    return [
      {id: "meta-llama/Llama-2-7b", name: "meta-llama/Llama-2-7b"},
      {id: "tiiuae/falcon-180B", name: "tiiuae/falcon-180B"},
      {id: "bigscience/bloom", name: "bigscience/bloom"},
      {id: "gpt2", name: "gpt2"},
      {id: "baichuan-inc/Baichuan2-13B-Chat", name: "baichuan-inc/Baichuan2-13B-Chat"},
      {id: "THUDM/chatglm2-6b", name: "THUDM/chatglm2-6b"},
    ];
  } else if (type === "Claude") {
    return [
      {id: "claude-opus-4-5", name: "claude-opus-4-5"},
      {id: "claude-opus-4-1", name: "claude-opus-4-1"},
      {id: "claude-opus-4-0", name: "claude-opus-4-0"},
      {id: "claude-opus-4-20250514", name: "claude-opus-4-20250514"},
      {id: "claude-4-opus-20250514", name: "claude-4-opus-20250514"},
      {id: "claude-sonnet-4-0", name: "claude-sonnet-4-0"},
      {id: "claude-sonnet-4-20250514", name: "claude-sonnet-4-20250514"},
      {id: "claude-4-sonnet-20250514", name: "claude-4-sonnet-20250514"},
      {id: "claude-3-7-sonnet-latest", name: "claude-3-7-sonnet-latest"},
      {id: "claude-3-7-sonnet-20250219", name: "claude-3-7-sonnet-20250219"},
      {id: "claude-3-5-haiku-latest", name: "claude-3-5-haiku-latest"},
      {id: "claude-3-5-haiku-20241022", name: "claude-3-5-haiku-20241022"},
      {id: "claude-3-5-sonnet-latest", name: "claude-3-5-sonnet-latest"},
      {id: "claude-3-opus-latest", name: "claude-3-opus-latest"},
      {id: "claude-3-haiku-20240307", name: "claude-3-haiku-20240307"},
    ];
  } else if (type === "OpenRouter") {
    return [
      {id: "google/palm-2-codechat-bison", name: "google/palm-2-codechat-bison"},
      {id: "google/palm-2-chat-bison", name: "google/palm-2-chat-bison"},
      {id: "openai/gpt-3.5-turbo", name: "openai/gpt-3.5-turbo"},
      {id: "openai/gpt-3.5-turbo-16k", name: "openai/gpt-3.5-turbo-16k"},
      {id: "openai/gpt-4", name: "openai/gpt-4"},
      {id: "openai/gpt-4-32k", name: "openai/gpt-4-32k"},
      {id: "anthropic/claude-2", name: "anthropic/claude-2"},
      {id: "anthropic/claude-instant-v1", name: "anthropic/claude-instant-v1"},
      {id: "meta-llama/llama-2-13b-chat", name: "meta-llama/llama-2-13b-chat"},
      {id: "meta-llama/llama-2-70b-chat", name: "meta-llama/llama-2-70b-chat"},
      {id: "palm-2-codechat-bison", name: "palm-2-codechat-bison"},
      {id: "palm-2-chat-bison", name: "palm-2-chat-bison"},
      {id: "gpt-3.5-turbo", name: "gpt-3.5-turbo"},
      {id: "gpt-3.5-turbo-16k", name: "gpt-3.5-turbo-16k"},
      {id: "gpt-4", name: "gpt-4"},
      {id: "gpt-4-32k", name: "gpt-4-32k"},
      {id: "claude-2", name: "claude-2"},
      {id: "claude-instant-v1", name: "claude-instant-v1"},
      {id: "llama-2-13b-chat", name: "llama-2-13b-chat"},
      {id: "llama-2-70b-chat", name: "llama-2-70b-chat"},
    ];
  } else if (type === "Baidu Cloud") {
    return [
      {id: "ernie-5.0", name: "ernie-5.0"},
      {id: "ernie-5.0-thinking-preview", name: "ernie-5.0-thinking-preview"},
      {id: "ernie-5.0-thinking-latest", name: "ernie-5.0-thinking-latest"},
      {id: "ernie-5.0-thinking-exp", name: "ernie-5.0-thinking-exp"},
      {id: "ernie-4.5-turbo-128k-preview", name: "ernie-4.5-turbo-128k-preview"},
      {id: "ernie-4.5-turbo-128k", name: "ernie-4.5-turbo-128k"},
      {id: "ernie-4.5-turbo-32k", name: "ernie-4.5-turbo-32k"},
      {id: "ernie-4.5-turbo-20260402", name: "ernie-4.5-turbo-20260402"},
      {id: "ernie-4.5-turbo-latest", name: "ernie-4.5-turbo-latest"},
      {id: "ernie-4.5-turbo-vl-preview", name: "ernie-4.5-turbo-vl-preview"},
      {id: "ernie-4.5-turbo-vl", name: "ernie-4.5-turbo-vl"},
      {id: "ernie-4.5-turbo-vl-32k", name: "ernie-4.5-turbo-vl-32k"},
      {id: "ernie-4.5-turbo-vl-32k-preview", name: "ernie-4.5-turbo-vl-32k-preview"},
      {id: "ernie-4.5-turbo-vl-latest", name: "ernie-4.5-turbo-vl-latest"},
      {id: "ernie-4.5-8k-preview", name: "ernie-4.5-8k-preview"},
      {id: "ernie-4.5-vl-28b-a3b", name: "ernie-4.5-vl-28b-a3b"},
      {id: "ernie-4.5-0.3b", name: "ernie-4.5-0.3b"},
      {id: "ernie-4.5-21b-a3b-thinking", name: "ernie-4.5-21b-a3b-thinking"},
      {id: "ernie-4.5-21b-a3b", name: "ernie-4.5-21b-a3b"},
      {id: "ernie-x1.1", name: "ernie-x1.1"},
      {id: "ernie-x1.1-preview", name: "ernie-x1.1-preview"},
      {id: "ernie-x1-turbo-32k", name: "ernie-x1-turbo-32k"},
      {id: "ernie-x1-turbo-32k-preview", name: "ernie-x1-turbo-32k-preview"},
      {id: "ernie-x1-turbo-latest", name: "ernie-x1-turbo-latest"},
      {id: "ernie-x1-32k", name: "ernie-x1-32k"},
      {id: "ernie-x1-32k-preview", name: "ernie-x1-32k-preview"},
      {id: "ernie-speed-pro-128k", name: "ernie-speed-pro-128k"},
      {id: "ernie-lite-pro-128k", name: "ernie-lite-pro-128k"},
      {id: "ernie-char-8k", name: "ernie-char-8k"},
      {id: "ernie-char-fiction-8k", name: "ernie-char-fiction-8k"},
      {id: "ernie-char-fiction-8k-preview", name: "ernie-char-fiction-8k-preview"},
      {id: "ernie-novel-8k", name: "ernie-novel-8k"},
      {id: "ernie-4.0-8k", name: "ernie-4.0-8k"},
      {id: "ernie-4.0-8k-latest", name: "ernie-4.0-8k-latest"},
      {id: "ernie-4.0-8k-preview", name: "ernie-4.0-8k-preview"},
      {id: "ernie-4.0-turbo-8k", name: "ernie-4.0-turbo-8k"},
      {id: "ernie-4.0-turbo-128k", name: "ernie-4.0-turbo-128k"},
      {id: "ernie-4.0-turbo-8k-preview", name: "ernie-4.0-turbo-8k-preview"},
      {id: "ernie-4.0-turbo-8k-latest", name: "ernie-4.0-turbo-8k-latest"},
      {id: "ernie-3.5-8k", name: "ernie-3.5-8k"},
      {id: "ernie-3.5-128k", name: "ernie-3.5-128k"},
      {id: "ernie-3.5-8k-preview", name: "ernie-3.5-8k-preview"},
      {id: "ernie-3.5-128k-preview", name: "ernie-3.5-128k-preview"},
      {id: "deepseek-v3.2", name: "deepseek-v3.2"},
      {id: "deepseek-v3.2-think", name: "deepseek-v3.2-think"},
      {id: "deepseek-v3.1-250821", name: "deepseek-v3.1-250821"},
      {id: "deepseek-v3.1-think-250821", name: "deepseek-v3.1-think-250821"},
      {id: "deepseek-v3", name: "deepseek-v3"},
      {id: "deepseek-r1-250528", name: "deepseek-r1-250528"},
      {id: "deepseek-r1", name: "deepseek-r1"},
      {id: "deepseek-r1-distill-qwen-32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1-distill-qwen-14b", name: "deepseek-r1-distill-qwen-14b"},
      {id: "deepseek-r1-distill-qianfan-70b", name: "deepseek-r1-distill-qianfan-70b"},
      {id: "deepseek-r1-distill-qianfan-8b", name: "deepseek-r1-distill-qianfan-8b"},
      {id: "glm-5.1", name: "glm-5.1"},
      {id: "glm-5", name: "glm-5"},
      {id: "kimi-k2.5", name: "kimi-k2.5"},
      {id: "kimi-k2-instruct", name: "kimi-k2-instruct"},
      {id: "minimax-m2.5", name: "minimax-m2.5"},
      {id: "minimax-m2.1", name: "minimax-m2.1"},
      {id: "qwen3-coder-480b-a35b-instruct", name: "qwen3-coder-480b-a35b-instruct"},
      {id: "qwen3-coder-30b-a3b-instruct", name: "qwen3-coder-30b-a3b-instruct"},
      {id: "qwen3-next-80b-a3b-instruct", name: "qwen3-next-80b-a3b-instruct"},
      {id: "qwen3-next-80b-a3b-thinking", name: "qwen3-next-80b-a3b-thinking"},
      {id: "qwen3-235b-a22b-instruct-2507", name: "qwen3-235b-a22b-instruct-2507"},
      {id: "qwen3-235b-a22b-thinking-2507", name: "qwen3-235b-a22b-thinking-2507"},
      {id: "qwen3-30b-a3b-instruct-2507", name: "qwen3-30b-a3b-instruct-2507"},
      {id: "qwen3-30b-a3b-thinking-2507", name: "qwen3-30b-a3b-thinking-2507"},
      {id: "qwen3-30b-a3b", name: "qwen3-30b-a3b"},
      {id: "qwen3-32b", name: "qwen3-32b"},
      {id: "qwen3-14b", name: "qwen3-14b"},
      {id: "qwen3-8b", name: "qwen3-8b"},
      {id: "qwen3-4b", name: "qwen3-4b"},
      {id: "qwen3-1.7b", name: "qwen3-1.7b"},
      {id: "qwen3-0.6b", name: "qwen3-0.6b"},
      {id: "qwen3-vl-235b-a22b-instruct", name: "qwen3-vl-235b-a22b-instruct"},
      {id: "qwen3-vl-235b-a22b-thinking", name: "qwen3-vl-235b-a22b-thinking"},
      {id: "qwen3-vl-30b-a3b-instruct", name: "qwen3-vl-30b-a3b-instruct"},
      {id: "qwen3-vl-30b-a3b-thinking", name: "qwen3-vl-30b-a3b-thinking"},
      {id: "qwen3-vl-32b-instruct", name: "qwen3-vl-32b-instruct"},
      {id: "qwen3-vl-32b-thinking", name: "qwen3-vl-32b-thinking"},
      {id: "qwen3-vl-8b-instruct", name: "qwen3-vl-8b-instruct"},
      {id: "qwen3-vl-8b-thinking", name: "qwen3-vl-8b-thinking"},
      {id: "qwen3.5-397b-a17b", name: "qwen3.5-397b-a17b"},
      {id: "qwen3.5-122b-a10b", name: "qwen3.5-122b-a10b"},
      {id: "qwen3.5-27b", name: "qwen3.5-27b"},
      {id: "qwen3.5-35b-a3b", name: "qwen3.5-35b-a3b"},
      {id: "qwen2.5-7b-instruct", name: "qwen2.5-7b-instruct"},
      {id: "qwen2.5-vl-7b-instruct", name: "qwen2.5-vl-7b-instruct"},
      {id: "qwen2.5-vl-32b-instruct", name: "qwen2.5-vl-32b-instruct"},
      {id: "qwq-32b", name: "qwq-32b"},
      {id: "qianfan-check-vl", name: "qianfan-check-vl"},
      {id: "qianfan-vl-70b", name: "qianfan-vl-70b"},
      {id: "qianfan-vl-8b", name: "qianfan-vl-8b"},
      {id: "qianfan-vl-1.5-flash", name: "qianfan-vl-1.5-flash"},
      {id: "qianfan-funccaller", name: "qianfan-funccaller"},
      {id: "qianfan-toytalk", name: "qianfan-toytalk"},
      {id: "qianfan-llama-vl-8b", name: "qianfan-llama-vl-8b"},
      {id: "qianfan-composition", name: "qianfan-composition"},
      {id: "qianfan-8b", name: "qianfan-8b"},
      {id: "qianfan-70b", name: "qianfan-70b"},
      {id: "internvl3-38b", name: "internvl3-38b"},
      {id: "internvl2.5-38b-mpo", name: "internvl2.5-38b-mpo"},
    ];
  } else if (type === "Cohere") {
    return [
      {id: "command-light", name: "command-light"},
      {id: "command", name: "command"},
    ];
  } else if (type === "iFlytek") {
    return [
      {id: "spark-x2", name: "spark-x2"},
      {id: "spark-x1.5", name: "spark-x1.5"},
      {id: "spark4.0-ultra", name: "spark4.0-ultra"},
      {id: "spark-max", name: "spark-max"},
      {id: "spark-max-32k", name: "spark-max-32k"},
      {id: "spark-pro", name: "spark-pro"},
      {id: "spark-pro-128k", name: "spark-pro-128k"},
      {id: "spark-lite", name: "spark-lite"},
    ];
  } else if (type === "ChatGLM") {
    return [
      {id: "glm-3-turbo", name: "glm-3-turbo"},
      {id: "glm-4", name: "glm-4"},
      {id: "glm-4V", name: "glm-4V"},
    ];
  } else if (type === "MiniMax") {
    return [
      {id: "MiniMax-Text-01", name: "MiniMax-Text-01"},
      {id: "abab6.5s-chat", name: "abab6.5s-chat"},
      {id: "abab6.5g-chat", name: "abab6.5g-chat"},
      {id: "abab6.5t-chat", name: "abab6.5t-chat"},
    ];
  } else if (type === "Ollama") {
    return [
      {id: "deepseek-r1:671b", name: "deepseek-r1:671b"},
      {id: "deepseek-r1:1.5b", name: "deepseek-r1-distill-qwen-1.5b"},
      {id: "deepseek-r1:7b", name: "deepseek-r1-distill-qwen-7b"},
      {id: "deepseek-r1:14b", name: "deepseek-r1-distill-qwen-14b"},
      {id: "deepseek-r1:32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1:8b", name: "deepseek-r1-distill-llama-8b"},
      {id: "deepseek-r1:70b", name: "deepseek-r1-distill-llama-70b"},
      {id: "llama3.3:70b", name: "llama3.3:70b"},
      {id: "qwen2.5:7b", name: "qwen2.5:7b"},
      {id: "qwen2.5:14b", name: "qwen2.5:14b"},
      {id: "qwen2.5:32b", name: "qwen2.5:32b"},
      {id: "qwen2.5:72b", name: "qwen2.5:72b"},
      {id: "deepseek-v3:671b", name: "deepseek-v3:671b"},
      {id: "llama3.2:1b", name: "llama3.2:1b"},
      {id: "llama3.2:3b", name: "llama3.2:3b"},
      {id: "llama3:8b", name: "llama3:8b"},
      {id: "llama3:70b", name: "llama3:70b"},
    ];
  } else if (type === "Local") {
    return [
      {id: "custom-model", name: "custom-model"},
    ];
  } else if (type === "Moonshot") {
    return [
      {id: "moonshot-v1-8k", name: "moonshot-v1-8k"},
      {id: "moonshot-v1-32k", name: "moonshot-v1-32k"},
      {id: "moonshot-v1-128k", name: "moonshot-v1-128k"},
      {id: "kimi-k2-0905-preview", name: "kimi-k2-0905-preview"},
      {id: "kimi-k2-0711-preview", name: "kimi-k2-0711-preview"},
      {id: "kimi-k2-turbo-preview", name: "kimi-k2-turbo-preview"},
      {id: "kimi-k2-thinking", name: "kimi-k2-thinking"},
      {id: "kimi-k2-thinking-turbo", name: "kimi-k2-thinking-turbo"},
      {id: "kimi-latest", name: "kimi-latest (Auto Tier)"},
    ];
  } else if (type === "Amazon Bedrock") {
    return [
      {id: "claude", name: "Claude"},
      {id: "claude-instant", name: "Claude Instant"},
      {id: "command", name: "Command"},
      {id: "command-light", name: "Command Light"},
      {id: "embed-english", name: "Embed - English"},
      {id: "embed-multilingual", name: "Embed - Multilingual"},
      {id: "jurassic-2-mid", name: "Jurassic-2 Mid"},
      {id: "jurassic-2-ultra", name: "Jurassic-2 Ultra"},
      {id: "llama-2-chat-13b", name: "Llama 2 Chat (13B)"},
      {id: "llama-2-chat-70b", name: "Llama 2 Chat (70B)"},
      {id: "titan-text-lite", name: "Titan Text Lite"},
      {id: "titan-text-express", name: "Titan Text Express"},
      {id: "titan-embeddings", name: "Titan Embeddings"},
      {id: "titan-multimodal-embeddings", name: "Titan Multimodal Embeddings"},
    ];
  } else if (type === "Alibaba Cloud") {
    return [
      {id: "qwen-long", name: "qwen-long"},
      {id: "qwen-turbo", name: "qwen-turbo"},
      {id: "qwen-plus", name: "qwen-plus"},
      {id: "qwen-max", name: "qwen-max"},
      {id: "qwen-max-longcontext", name: "qwen-max-longcontext"},
      {id: "qwen3-235b-a22b", name: "qwen3-235b-a22b"},
      {id: "qwen3-32b", name: "qwen3-32b"},
      {id: "deepseek-r1", name: "deepseek-r1"},
      {id: "deepseek-v3", name: "deepseek-v3"},
      {id: "deepseek-v3.1", name: "deepseek-v3.1"},
      {id: "deepseek-v3.2", name: "deepseek-v3.2"},
      {id: "deepseek-r1-distill-qwen-1.5b", name: "deepseek-r1-distill-qwen-1.5b"},
      {id: "deepseek-r1-distill-qwen-7b", name: "deepseek-r1-distill-qwen-7b"},
      {id: "deepseek-r1-distill-qwen-14b ", name: "deepseek-r1-distill-qwen-14b "},
      {id: "deepseek-r1-distill-qwen-32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1-distill-llama-8b", name: "deepseek-r1-distill-llama-8b"},
      {id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b"},
      // Wanxiang image generation models
      {id: "wanx2.1-t2i-turbo", name: "wanx2.1-t2i-turbo"},
      {id: "wanx2.1-t2i-plus", name: "wanx2.1-t2i-plus"},
      {id: "wanx-v1", name: "wanx-v1"},
    ];
  } else if (type === "Baichuan") {
    return [
      {id: "Baichuan2-Turbo", name: "Baichuan2-Turbo"},
      {id: "Baichuan2-53B", name: "Baichuan2-53B"},
      {id: "Baichuan3-Turbo", name: "Baichuan3-Turbo"},
      {id: "Baichuan3-Turbo-128k", name: "Baichuan3-Turbo-128k"},
      {id: "Baichuan4", name: "Baichuan4"},
      {id: "Baichuan4-Air", name: "Baichuan4-Air"},
      {id: "Baichuan4-Turbo", name: "Baichuan4-Turbo"},
    ];
  } else if (type === "Volcano Engine") {
    return [
      // Seed 2.0 series
      {id: "doubao-seed-2-0-pro-260215", name: "doubao-seed-2-0-pro-260215"},
      {id: "doubao-seed-2-0-lite-260215", name: "doubao-seed-2-0-lite-260215"},
      {id: "doubao-seed-2-0-mini-260215", name: "doubao-seed-2-0-mini-260215"},
      {id: "doubao-seed-2-0-code-preview-260215", name: "doubao-seed-2-0-code-preview-260215"},
      // Seed 1.8
      {id: "doubao-seed-1-8-251228", name: "doubao-seed-1-8-251228"},
      // Seed character & code
      {id: "doubao-seed-character-251128", name: "doubao-seed-character-251128"},
      {id: "doubao-seed-code-preview-251028", name: "doubao-seed-code-preview-251028"},
      // Seed 1.6 series
      {id: "doubao-seed-1-6-251015", name: "doubao-seed-1-6-251015"},
      {id: "doubao-seed-1-6-lite-251015", name: "doubao-seed-1-6-lite-251015"},
      {id: "doubao-seed-1-6-flash-250828", name: "doubao-seed-1-6-flash-250828"},
      {id: "doubao-seed-1-6-vision-250815", name: "doubao-seed-1-6-vision-250815"},
      {id: "doubao-seed-translation-250915", name: "doubao-seed-translation-250915"},
      // Doubao 1.5 series
      {id: "doubao-1-5-pro-32k-250115", name: "doubao-1-5-pro-32k-250115"},
      {id: "doubao-1-5-pro-32k-character-250715", name: "doubao-1-5-pro-32k-character-250715"},
      {id: "doubao-1-5-lite-32k-250115", name: "doubao-1-5-lite-32k-250115"},
      {id: "doubao-1-5-vision-pro-32k-250115", name: "doubao-1-5-vision-pro-32k-250115"},
      // GLM model
      {id: "glm-4-7-251222", name: "glm-4-7-251222"},
      // DeepSeek models
      {id: "deepseek-v3-2-251201", name: "deepseek-v3-2-251201"},
      {id: "deepseek-v3-1-terminus", name: "deepseek-v3-1-terminus"},
      {id: "deepseek-v3-250324", name: "deepseek-v3-250324"},
      {id: "deepseek-r1-250528", name: "deepseek-r1-250528"},
      // Embedding models
      {id: "doubao-embedding-vision-251215", name: "doubao-embedding-vision-251215"},
      // Video generation models
      {id: "doubao-seedance-2-0-260128", name: "doubao-seedance-2-0-260128"},
      {id: "doubao-seedance-2-0-fast-260128", name: "doubao-seedance-2-0-fast-260128"},
      {id: "doubao-seedance-1-5-pro-251215", name: "doubao-seedance-1-5-pro-251215"},
      {id: "doubao-seedance-1-0-pro-250528", name: "doubao-seedance-1-0-pro-250528"},
      {id: "doubao-seedance-1-0-pro-fast-251015", name: "doubao-seedance-1-0-pro-fast-251015"},
      {id: "doubao-seedance-1-0-lite-t2v-250428", name: "doubao-seedance-1-0-lite-t2v-250428"},
      {id: "doubao-seedance-1-0-lite-i2v-250428", name: "doubao-seedance-1-0-lite-i2v-250428"},
      // Image generation models
      {id: "doubao-seedream-5-0-260128", name: "doubao-seedream-5-0-260128"},
      {id: "doubao-seedream-5-0-lite-260128", name: "doubao-seedream-5-0-lite-260128"},
      {id: "doubao-seedream-4-5-251128", name: "doubao-seedream-4-5-251128"},
      {id: "doubao-seedream-4-0-250828", name: "doubao-seedream-4-0-250828"},
      {id: "doubao-seedream-3-0-t2i-250415", name: "doubao-seedream-3-0-t2i-250415"},
    ];
  } else if (type === "DeepSeek") {
    return [
      {id: "deepseek-v4-pro", name: "deepseek-v4-pro"},
      {id: "deepseek-v4-flash", name: "deepseek-v4-flash"},
      {id: "deepseek-chat", name: "deepseek-chat"},
      {id: "deepseek-reasoner", name: "deepseek-reasoner"},
    ];
  } else if (type === "StepFun") {
    return [
      {id: "step-1-8k", name: "step-1-8k"},
      {id: "step-1-32k", name: "step-1-32k"},
      {id: "step-1-256k", name: "step-1-256k"},
      {id: "step-2-mini", name: "step-2-mini"},
      {id: "step-2-16k", name: "step-2-16k"},
      {id: "step-2-16k-exp", name: "step-2-16k-exp"},
    ];
  } else if (type === "Tencent Cloud") {
    return [
      {id: "hunyuan-lite", name: "hunyuan-lite"},
      {id: "hunyuan-standard", name: "hunyuan-standard"},
      {id: "hunyuan-standard-256K", name: "hunyuan-standard-256K"},
      {id: "hunyuan-pro", name: "hunyuan-pro"},
      {id: "hunyuan-code", name: " hunyuan-code"},
      {id: "hunyuan-role", name: "hunyuan-role"},
      {id: "hunyuan-turbo", name: "hunyuan-turbo"},
      {id: "deepseek-r1", name: "deepseek-r1"},
      {id: "deepseek-v3", name: "deepseek-v3"},
      {id: "deepseek-r1-distill-qwen-1.5b", name: "deepseek-r1-distill-qwen-1.5b"},
      {id: "deepseek-r1-distill-qwen-7b", name: "deepseek-r1-distill-qwen-7b"},
      {id: "deepseek-r1-distill-qwen-14b", name: "deepseek-r1-distill-qwen-14b"},
      {id: "deepseek-r1-distill-qwen-32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1-distill-llama-8b", name: "deepseek-r1-distill-llama-8b"},
      {id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b"},
    ];
  } else if (type === "Mistral") {
    return [
      {id: "mistral-large-latest", name: "mistral-large-latest"},
      {id: "pixtral-large-latest", name: "pixtral-large-latest"},
      {id: "mistral-small-latest", name: "mistral-small-latest"},
      {id: "codestral-latest", name: "codestral-latest"},
      {id: "ministral-8b-latest", name: "ministral-8b-latest"},
      {id: "ministral-3b-latest", name: "ministral-3b-latest"},
      {id: "pixtral-12b", name: "pixtral-12b"},
      {id: "mistral-nemo", name: "mistral-nemo"},
      {id: "open-mistral-7b", name: "open-mistral-7b"},
      {id: "open-mixtral-8x7b", name: "open-mixtral-8x7b"},
      {id: "open-mixtral-8x22b", name: "open-mixtral-8x22b"},
    ];
  } else if (type === "Yi") {
    return [
      {id: "yi-lightning", name: "yi-lightning"},
      {id: "yi-vision-v2", name: "yi-vision-v2"},
    ];
  } else if (type === "Silicon Flow") {
    return [
      {id: "deepseek-ai/DeepSeek-R1", name: "deepseek-ai/DeepSeek-R1"},
      {id: "deepseek-ai/DeepSeek-V3", name: "deepseek-ai/DeepSeek-V3"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B", name: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B", name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Llama-8B", name: "deepseek-ai/DeepSeek-R1-Distill-Llama-8B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B"},
      {id: "deepseek-ai/DeepSeek-V2.5", name: "deepseek-ai/DeepSeek-V2.5"},
      {id: "meta-llama/Llama-3.3-70B-Instruct", name: "meta-llama/Llama-3.3-70B-Instruct"},
      {id: "meta-llama/Meta-Llama-3.1-405B-Instruct", name: "meta-llama/Meta-Llama-3.1-405B-Instruct"},
      {id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "meta-llama/Meta-Llama-3.1-70B-Instruct"},
      {id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "meta-llama/Meta-Llama-3.1-8B-Instruct"},
      {id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen/Qwen2.5-72B-Instruct"},
      {id: "Qwen/Qwen2.5-32B-Instruct", name: "Qwen/Qwen2.5-32B-Instruct"},
      {id: "Qwen/Qwen2.5-14B-Instruct", name: "Qwen/Qwen2.5-14B-Instruct"},
      {id: "Qwen/Qwen2.5-7B-Instruct", name: "Qwen/Qwen2.5-7B-Instruct"},
      {id: "THUDM/glm-4-9b-chat", name: "THUDM/glm-4-9b-chat"},
      {id: "01-ai/Yi-1.5-34B-Chat-16K", name: "01-ai/Yi-1.5-34B-Chat-16K"},
      {id: "01-ai/Yi-1.5-9B-Chat-16K", name: "01-ai/Yi-1.5-9B-Chat-16K"},
      {id: "google/gemma-2-27b-it", name: "google/gemma-2-27b-it"},
      {id: "google/gemma-2-9b-it", name: "google/gemma-2-9b-it"},
    ];
  } else if (type === "Grok") {
    return [
      {id: "grok-3-latest", name: "grok-3-latest"},
      {id: "grok-3-fast-latest", name: "grok-3-fast-latest"},
      {id: "grok-3-mini-latest", name: "grok-3-mini-latest"},
      {id: "grok-2-vision-latest", name: "grok-2-vision-latest"},
      {id: "grok-2-latest", name: "grok-2-latest"},
      {id: "grok-2-image-latest", name: "grok-2-image-latest"},
    ];
  } else if (type === "Writer") {
    return [
      {id: "palmyra-x5", name: "Palmyra X5"},
      {id: "palmyra-x4", name: "Palmyra X4"},
      {id: "palmyra-med", name: "Palmyra Med"},
      {id: "palmyra-fin", name: "Palmyra Fin"},
      {id: "palmyra-creative", name: "Palmyra Creative"},
    ];
  } else if (type === "Dummy") {
    return [
      {id: "Dummy", name: "Dummy"},
    ];
  } else {
    return [];
  }
}

export function getEmbeddingSubTypeOptions(type) {
  if (type === "OpenAI" || type === "Azure") {
    return openaiEmbeddings;
  } else if (type === "Gemini") {
    return [
      {id: "embedding-001", name: "embedding-001"},
    ];
  } else if (type === "Hugging Face") {
    return [
      {id: "sentence-transformers/all-MiniLM-L6-v2", name: "sentence-transformers/all-MiniLM-L6-v2"},
    ];
  } else if (type === "Cohere") {
    return [
      {id: "embed-english-v2.0", name: "embed-english-v2.0"},
      {id: "embed-english-light-v2.0", name: "embed-english-light-v2.0"},
      {id: "embed-multilingual-v2.0", name: "embed-multilingual-v2.0"},
      {id: "embed-english-v3.0", name: "embed-english-v3.0"},
    ];
  } else if (type === "MiniMax") {
    return [
      {id: "embo-01", name: "embo-01"},
    ];
  } else if (type === "Ollama") {
    return [
      {id: "nomic-embed-text", name: "nomic-embed-text"},
      {id: "mxbai-embed-large", name: "mxbai-embed-large"},
      {id: "snowflake-arctic-embed:335m", name: "snowflake-arctic-embed:335m"},
      {id: "snowflake-arctic-embed:137m", name: "snowflake-arctic-embed:137m"},
      {id: "snowflake-arctic-embed:110m", name: "snowflake-arctic-embed:110m"},
      {id: "snowflake-arctic-embed:33m", name: "snowflake-arctic-embed:33m"},
      {id: "snowflake-arctic-embed:22m", name: "snowflake-arctic-embed:22m"},
      {id: "bge-m3", name: "bge-m3"},
    ];
  } else if (type === "Local") {
    return [
      {id: "custom-embedding", name: "custom-embedding"},
    ];
  } else if (type === "Baidu Cloud") {
    return [
      {id: "Embedding-V1", name: "Embedding-V1"},
      {id: "bge-large-zh", name: "bge-large-zh"},
      {id: "bge-large-en", name: "bge-large-en"},
      {id: "tao-8k", name: "tao-8k"},
    ];
  } else if (type === "Alibaba Cloud") {
    return [
      {id: "text-embedding-v1", name: "text-embedding-v1"},
      {id: "text-embedding-v2", name: "text-embedding-v2"},
      {id: "text-embedding-v3", name: "text-embedding-v3"},
    ];
  } else if (type === "Tencent Cloud") {
    return [
      {id: "hunyuan-embedding", name: "hunyuan-embedding"},
    ];
  } else if (type === "Jina") {
    return [
      {id: "jina-embeddings-v2-base-zh", name: "jina-embeddings-v2-base-zh"},
      {id: "jina-embeddings-v2-base-en", name: "jina-embeddings-v2-base-en"},
      {id: "jina-embeddings-v2-base-de", name: "jina-embeddings-v2-base-de"},
      {id: "jina-embeddings-v2-base-code", name: "jina-embeddings-v2-base-code"},
    ];
  } else if (type === "Word2Vec") {
    return [
      {id: "Word2Vec", name: "Word2Vec"},
    ];
  } else {
    return [];
  }
}

export function getProviderSubTypeOptions(category, type) {
  if (category === "Model") {
    return getModelSubTypeOptions(type);
  } else if (category === "Embedding") {
    return getEmbeddingSubTypeOptions(type);
  } else if (category === "Agent") {
    if (type === "MCP") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "A2A") {
      return [
        {id: "Default", name: "Default"},
      ];
    }
    return [];
  } else if (category === "Tool") {
    if (type === "time") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "web_search") {
      return [
        {id: "DuckDuckGo", name: "DuckDuckGo"},
        {id: "Bing", name: "Bing"},
        {id: "Google", name: "Google"},
        {id: "Baidu", name: "Baidu"},
      ];
    } else if (type === "shell") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "office") {
      return [
        {id: "All", name: "All"},
        {id: "Word Read", name: "Word Read"},
        {id: "Word Write", name: "Word Write"},
        {id: "Excel Read", name: "Excel Read"},
        {id: "Excel Write", name: "Excel Write"},
        {id: "PowerPoint Read", name: "PowerPoint Read"},
        {id: "PowerPoint Write", name: "PowerPoint Write"},
      ];
    } else if (type === "web_fetch") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "web_browser") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "gui") {
      return [
        {id: "Windows UIA", name: "Windows UIA"},
      ];
    } else if (type === "video_download") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "browser_use") {
      return [
        {id: "Default", name: "Default"},
      ];
    }
    return [];
  } else if (category === "Text-to-Speech") {
    if (type === "Alibaba Cloud") {
      return [
        {id: "cosyvoice-v1", name: "cosyvoice-v1"},
      ];
    } else {
      return [];
    }
  } else if (category === "Speech-to-Text") {
    if (type === "Alibaba Cloud") {
      return [
        {id: "paraformer-realtime-v1", name: "paraformer-realtime-v1"},
      ];
    } else {
      return [];
    }
  } else if (category === "Bot") {
    if (type === "Tencent") {
      return [
        {id: "WeCom Bot", name: "WeCom Bot"},
      ];
    } else {
      return [];
    }
  }
  return [];
}

export function getProviderAzureApiVersionOptions() {
  return ([
    {id: "", name: ""},
    {id: "2023-03-15-preview", name: "2023-03-15-preview"},
    {id: "2023-05-15", name: "2023-05-15"},
    {id: "2023-06-01-preview", name: "2023-06-01-preview"},
    {id: "2023-07-01-preview", name: "2023-07-01-preview"},
    {id: "2023-08-01-preview", name: "2023-08-01-preview"},
  ]);
}

// Whether a Model-category provider is configured for image generation (vs chat/text).
export function isImageGenerationModelProvider(provider) {
  if (!provider || provider.category !== "Model") {
    return false;
  }
  const subType = (provider.subType || "").trim();
  const type = provider.type || "";
  const lower = subType.toLowerCase();

  if (type === "OpenAI" || type === "Azure") {
    if (lower.startsWith("gpt-image") || lower.includes("dall-e")) {
      return true;
    }
  }
  if (type === "Gemini") {
    if (lower.includes("imagen-") || lower === "gemini-2.5-flash-image" ||
        lower.includes("gemini-3.1-flash-image") || lower.includes("gemini-3-pro-image")) {
      return true;
    }
  }
  if (type === "Alibaba Cloud") {
    if (lower.includes("wanx") && (lower.includes("t2i") || lower.includes("wanx-v"))) {
      return true;
    }
  }
  if (type === "Volcano Engine") {
    if (lower.includes("seedream")) {
      return true;
    }
  }
  if (type === "Grok") {
    if (lower.includes("grok-2-image") || lower === "grok-2-image-latest") {
      return true;
    }
  }
  if (lower.includes("dall-e") || lower.startsWith("gpt-image")) {
    return true;
  }
  if (lower.includes("imagen-") && lower.includes("generate")) {
    return true;
  }
  if (lower.includes("seedream")) {
    return true;
  }
  if (lower.includes("wanx") && (lower.includes("t2i") || lower.includes("wanx-v"))) {
    return true;
  }
  if (/(^|-)image(-|preview)/i.test(subType) && !lower.includes("embedding") && type === "Gemini") {
    return true;
  }
  return false;
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

export function parseJsonFromText(text) {
  const regex = /\[\[(.*?)\]\]/;
  const match = regex.exec(text);

  if (match) {
    try {
      // const parsedJSON = JSON.parse(match[1]);
      const parsedJSON = match[1];
      return parsedJSON;
    } catch (error) {
      showMessage("error", error);
      return "";
    }
  }

  return "";
}

export function getSubdomain() {
  const url = window.location.origin;
  const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/;
  const matches = url.match(regex);
  if (matches && matches[1]) {
    const domainParts = matches[1].split(".");
    if (domainParts.length > 2) {
      return domainParts[0];
    }
  }
  return null;
}

export function getTimeFromSeconds(seconds) {
  const duration = moment.duration(seconds, "seconds");
  // const hours = Math.floor(duration.asHours()).toString().padStart(2, "0");
  const minutes = duration.minutes().toString().padStart(2, "0");
  const sec = duration.seconds().toString().padStart(2, "0");
  const millisec = duration.milliseconds().toString().padStart(3, "0").substring(0, 3);
  return `${minutes} : ${sec}.${millisec}`;
}

export function getSpeakerTag(speaker) {
  if (speaker.startsWith("Unknown")) {
    speaker = "Unknown";
  }

  return (
    <Tag color={speaker === "Teacher" ? "success" : speaker.startsWith("Student") ? "error" : "processing"}>
      {speaker}
    </Tag>
  );
}

export function getDisplayPrice(price, currency) {
  if (!price) {
    return "";
  }

  const tmp = price.toFixed(7);
  let numberStr = tmp.toString();
  if (numberStr.includes(".")) {
    numberStr = numberStr.replace(/(\.\d*?[1-9])0+$/, "$1");
    numberStr = numberStr.replace(/\.$/, "");
  }

  if (price === 0) {
    numberStr = "0";
  }

  let prefix = "$";
  if (currency === "CNY") {
    prefix = "￥";
  }

  return (
    <Tag style={{fontWeight: "bold"}} color={price === 0 ? "default" : "orange"}>
      {`${prefix}${numberStr}`}
    </Tag>
  );
}

export function getDisplayTag(s, color = "default") {
  return (
    <Tag style={{fontWeight: "bold"}} color={color}>
      {s}
    </Tag>
  );
}

export function sumFields(chats, field) {
  if (!chats) {
    return 0;
  }

  if (field === "count") {
    return chats.reduce((sum, chat) => sum + 1, 0);
  } else {
    return chats.reduce((sum, chat) => sum + chat[field], 0);
  }
}

export function uniqueFields(chats, field) {
  if (!chats) {
    return 0;
  }

  const res = new Set(chats.map(chat => chat[field]));
  return res.size;
}

export function getRefinedErrorText(errorText) {
  if (errorText.startsWith("error, status code: 400, message: The response was filtered due to the prompt triggering")) {
    return i18next.t("chat:Your chat text involves sensitive content. This chat has been forcibly terminated.");
  } else if (errorText.startsWith("write tcp ")) {
    return i18next.t("chat:The response has been interrupted. Please do not refresh the page during responding.");
  } else {
    return `${i18next.t("chat:An error occurred during responding")}: ${errorText}`;
  }
}

export function lighten(hexColor, amount) {
  amount = amount === 0 ? 0 : amount || 10;
  const rgbColor = hexToRgb(hexColor.slice(1));

  const hsl = rgbToHsl(rgbColor.r, rgbColor.g, rgbColor.b);

  hsl.l += amount;

  return hslToRgb(hsl.h, hsl.s, hsl.l);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return {
    r: r,
    g: g,
    b: b,
  };
}

function rgbToHsl(r, g, b) {
  r %= 256;
  g %= 256;
  b %= 256;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2 / 255;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (s < 0) {s = -s;}
    switch (max) {
    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    case g: h = (b - r) / d + 2; break;
    case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  h = Math.floor(h * 360);
  s = Math.floor(s * 100);
  l = Math.floor(l * 100);
  return {h, s, l};
}

function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  r = Math.round(r * 255);
  g = Math.round(g * 255);
  b = Math.round(b * 255);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function hueToRgb(p, q, t) {
  if (t < 0) {t += 1;}
  if (t > 1) {t -= 1;}
  if (t < 1 / 6) {return p + (q - p) * 6 * t;}
  if (t < 1 / 2) {return q;}
  if (t < 2 / 3) {return p + (q - p) * (2 / 3 - t) * 6;}
  return p;
}

export function updateTheme(color) {
  ThemeDefault.colorPrimary = color ? color : getThemeColor();
  ThemeDefault.colorBackground = lighten(ThemeDefault.colorPrimary, 45).toString();
  ThemeDefault.colorButton = lighten(ThemeDefault.colorPrimary, 20).toString();
  ThemeDefault.colorBackgroundSecondary = "rgb(242 242 242)";
  document.documentElement.style.setProperty("--theme-color", ThemeDefault.colorPrimary);
  document.documentElement.style.setProperty("--theme-background", ThemeDefault.colorBackground);
  document.documentElement.style.setProperty("--theme-button", ThemeDefault.colorButton);
  document.documentElement.style.setProperty("--theme-background-secondary", ThemeDefault.colorBackgroundSecondary);
}

export function formatSuggestion(suggestionText) {
  suggestionText = suggestionText.trim().replace(/^</, "").replace(/>$/, "");
  if (!suggestionText.endsWith("?") && !suggestionText.endsWith("？")) {
    suggestionText += "?";
  }
  return suggestionText;
}

export function getLabel(text, tooltip) {
  return (
    <React.Fragment>
      <span style={{marginRight: 4}}>{text}</span>
      <Tooltip placement="top" title={tooltip}>
        <QuestionCircleOutlined style={{color: "var(--ant-color-primary)"}} />
      </Tooltip>
    </React.Fragment>
  );
}

export function GetIdFromObject(obj) {
  if (obj === undefined || obj === null) {
    return "";
  }
  return `${obj.owner}/${obj.name}`;
}

export function GenerateId() {
  return uuidv4();
}

export function getBlockBrowserUrl(providerMap, record, block, isFirst = true) {
  const providerName = isFirst ? record.provider : record.provider2;
  const provider = providerMap[providerName];
  if (!provider || provider.browserUrl === "") {
    return block;
  }
  let url;
  if (provider.type === "ChainMaker") {
    url = provider.browserUrl.replace("{bh}", isFirst ? record.blockHash : record.blockHash2);
  } else {
    url = provider.browserUrl.replace("{bh}", block).replace("{chainId}", 1).replace("{clusterId}", provider.network);
  }
  return (
    <a target="_blank" rel="noreferrer" href={url}>
      {block}
    </a>
  );
}

export function formatJsonString(s) {
  if (s === "") {
    return "";
  }

  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch (error) {
    return s;
  }
}

export function getThinkingModelMaxTokens(subType) {
  if (subType.includes("claude")) {
    if (subType.includes("4")) {
      if (subType.includes("sonnet")) {
        return 64000;
      } else if (subType.includes("opus")) {
        return 32000;
      }
    } else if (subType.includes("3-7") || subType.includes("sonnet")) {
      return 64000;
    }
  }
  return 0;
}

export function getAlgorithm(themeAlgorithmNames) {
  return themeAlgorithmNames.sort().reverse().map((algorithmName) => {
    if (algorithmName === "dark") {
      return theme.darkAlgorithm;
    }
    if (algorithmName === "compact") {
      return theme.compactAlgorithm;
    }
    return theme.defaultAlgorithm;
  });
}

export function getIsDark() {
  try {
    const stored = localStorage.getItem("themeAlgorithm");
    return stored ? JSON.parse(stored).includes("dark") : false;
  } catch (_) {
    return false;
  }
}

export function getHtmlTitle(storeHtmlTitle) {
  const defaultHtmlTitle = "OpenAgent";
  let htmlTitle = Conf.HtmlTitle;
  if (storeHtmlTitle && storeHtmlTitle !== defaultHtmlTitle) {
    htmlTitle = storeHtmlTitle;
  }
  return htmlTitle;
}

export function getFaviconUrl(themes, storeFaviconUrl) {
  const defaultFaviconUrl = "https://cdn.casibase.com/static/favicon.png";
  let faviconUrl = Conf.FaviconUrl;
  if (storeFaviconUrl && storeFaviconUrl !== defaultFaviconUrl) {
    faviconUrl = storeFaviconUrl;
  }
  if (themes.includes("dark")) {
    return faviconUrl.replace(/\.png$/, "_white.png");
  } else {
    return faviconUrl;
  }
}

/** Store avatar for dropdowns (same source as store list). */
export function getStoreIconUrl(store) {
  if (!store) {
    return getDefaultAiAvatar();
  }
  return store.avatar || getDefaultAiAvatar();
}

export function getLogo(themes, storeLogoUrl) {
  const defaultLogoUrl = "https://cdn.openagentai.org/img/openagent-logo_1600x276.png";
  let logoUrl = Conf.LogoUrl;
  if (storeLogoUrl && storeLogoUrl !== defaultLogoUrl) {
    logoUrl = storeLogoUrl;
  }
  logoUrl = logoUrl.replace("https://cdn.openagentai.org", Conf.StaticBaseUrl);
  if (themes.includes("dark")) {
    return logoUrl.replace(/\.png$/, "_white.png");
  } else {
    return logoUrl;
  }
}

export function getFooterHtml(themes, storeFooterHtml) {
  const defaultFooterHtml = "Powered by <a target=\"_blank\" href=\"https://github.com/the-open-agent/openagent\" rel=\"noreferrer\"><img style=\"padding-bottom: 3px;\" height=\"20\" alt=\"OpenAgent\" src=\"https://cdn.openagentai.org/img/openagent-logo_1600x276.png\" /></a>";
  let footerHtml = Conf.FooterHtml;
  if (storeFooterHtml && storeFooterHtml !== defaultFooterHtml) {
    footerHtml = storeFooterHtml;
  }
  footerHtml = footerHtml.replace("https://cdn.openagentai.org", Conf.StaticBaseUrl);
  if (themes.includes("dark")) {
    return footerHtml.replace(/(\.png)/g, "_white$1");
  } else {
    return footerHtml;
  }
}

export function getDeduplicatedArray(array, filterArray, key) {
  const res = array.filter(item => !filterArray.some(tableItem => tableItem[key] === item[key]));
  return res;
}

export function getFormTypeOptions() {
  return [
    {id: "records", name: "general:Records"},
    {id: "stores", name: "general:Stores"},
    {id: "vectors", name: "general:Vectors"},
    {id: "videos", name: "general:Videos"},
    {id: "tasks", name: "general:Tasks"},
    {id: "workflows", name: "general:Workflows"},
    {id: "articles", name: "general:Articles"},
    {id: "graphs", name: "general:Graphs"},
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
      {name: "messageCount", label: "store:Message count", visible: true, width: "150"},
      {name: "vectorCount", label: "store:Vector count", visible: true, width: "150"},
      {name: "storageProvider", label: "store:Storage provider", visible: true, width: "250"},
      // { name: "splitProvider", label: "store:Split provider", visible: false, width: "200" },
      {name: "imageProvider", label: "store:Image provider", visible: true, width: "300"},
      {name: "modelProvider", label: "provider:Model provider", visible: true, width: "330"},
      {name: "embeddingProvider", label: "store:Embedding provider", visible: true, width: "300"},
      {name: "textToSpeechProvider", label: "store:Text-to-Speech provider", visible: true, width: "300"},
      {name: "speechToTextProvider", label: "store:Speech-to-Text provider", visible: true, width: "200"},
      {name: "agentProvider", label: "store:Agent provider", visible: true, width: "250"},
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
  } else if (formType === "videos") {
    return [
      {name: "owner", label: "general:User", visible: true, width: "90"},
      {name: "name", label: "general:Name", visible: true, width: "180"},
      {name: "displayName", label: "general:Display name", visible: true, width: "180"},
      {name: "description", label: "general:Description", visible: true, width: "120"},
      {name: "grade", label: "video:Grade", visible: true, width: "90"},
      {name: "unit", label: "general:Unit", visible: true, width: "90"},
      {name: "lesson", label: "video:Lesson", visible: true, width: "90"},
      // { name: "videoId", label: "video:Video ID", visible: false, width: "250" },
      {name: "coverUrl", label: "video:Cover", visible: true, width: "170"},
      {name: "remarks", label: "video:Remarks", visible: true},
      // { name: "labels", label: "task:Labels", visible: false, width: "120" },
      {name: "state", label: "general:State", visible: true, width: "90"},
      {name: "reviewState", label: "video:Review state", visible: true, width: "110"},
      {name: "isPublic", label: "video:Is public", visible: true, width: "110"},
      {name: "downloadUrl", label: "general:Download", visible: true, width: "110"},
      // { name: "labelCount", label: "video:Label count", visible: false, width: "90" },
      // { name: "segmentCount", label: "video:Segment count", visible: false, width: "110" },
      {name: "excellentCount", label: "video:Excellent count", visible: true, width: "110"},
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
      {name: "grade", label: "video:Grade", visible: true, width: "200"},
      // { name: "application", label: "task:Application", visible: false, width: "180" },
      // { name: "path", label: "provider:Path", visible: false },
      {name: "text", label: "general:Text", visible: true},
      {name: "labels", label: "task:Labels", visible: true, width: "250"},
      {name: "example", label: "task:Example", visible: true},
    ];
  } else if (formType === "workflows") {
    return [
      {name: "name", label: "general:Name", visible: true, width: "160"},
      {name: "displayName", label: "general:Display name", visible: true, width: "200"},
      {name: "text", label: "general:Text", visible: true},
      {name: "text2", label: "general:Text2", visible: true},
      {name: "message", label: "general:Message", visible: true},
      {name: "questionTemplate", label: "task:Question", visible: true},
    ];
  } else if (formType === "articles") {
    return [
      {name: "name", label: "general:Name", visible: true, width: "160"},
      {name: "displayName", label: "general:Display name", visible: true, width: "200"},
      {name: "workflow", label: "store:Workflow", visible: true, width: "250"},
      // { name: "type", label: "general:Type", visible: false, width: "90" },
      {name: "content", label: "article:Content", visible: true},
    ];
  } else if (formType === "graphs") {
    return [
      {name: "name", label: "general:Name", visible: true, width: "160"},
      {name: "displayName", label: "general:Display name", visible: true, width: "200"},
      {name: "createdTime", label: "general:Created time", visible: true, width: "200"},
      {name: "text", label: "general:Text", visible: true, width: "200"},
      {name: "graph", label: "general:Graphs", visible: true, width: "240"},
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

export function getBuiltinTools() {
  return [
    {
      category: "code",
      name: "Code Tools",
      icon: "💻",
      tools: [
        {name: "execute_code", description: "Execute code"},
      ],
    },
    {
      category: "json",
      name: "JSON Tools",
      icon: "📋",
      tools: [
        {name: "process_json", description: "Process JSON"},
      ],
    },
  ];
}

export function getFormattedSize(bytes) {
  if (bytes === 0) {return "0 Bytes";}
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
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
  if (type === "web_fetch") {
    return [{
      name: "web_fetch",
      description: "Fetch and extract content from a web URL",
      testContent: JSON.stringify({tool: "web_fetch", arguments: {url: "https://openagentai.org", max_length: 3000}}, null, 2),
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
