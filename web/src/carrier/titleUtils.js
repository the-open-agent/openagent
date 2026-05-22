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

export const FALLBACK_TITLE_MAX_RUNES = 16;
export const MAX_CHAT_DISPLAY_NAME_RUNES = 100;

const HTML_TAG_RE = /<[^>]+>/gi;
const WHITESPACE_RE = /\s+/g;
const SUGGESTION_LEAK_RE = /\|\|\|/;

export function sanitizeUserMessageForTitle(text) {
  let value = (text || "").trim();
  if (!value) {
    return "";
  }

  value = value.replace(HTML_TAG_RE, " ");
  value = value.replace(/\r\n/g, "\n").replace(/\n/g, " ");
  value = value.replace(WHITESPACE_RE, " ").trim();
  return value;
}

export function normalizeAITitle(title) {
  let value = (title || "").trim();
  if (!value) {
    return "";
  }

  const lineBreak = value.search(/[\r\n]/);
  if (lineBreak >= 0) {
    value = value.slice(0, lineBreak).trim();
  }
  if (SUGGESTION_LEAK_RE.test(value)) {
    value = value.split(SUGGESTION_LEAK_RE, 1)[0].trim();
  }
  return value.trim();
}

export function truncateRunes(text, maxRunes, withEllipsis) {
  if (maxRunes <= 0 || !text) {
    return "";
  }

  const runes = Array.from(text);
  if (runes.length <= maxRunes) {
    return text;
  }
  if (withEllipsis && maxRunes > 1) {
    return `${runes.slice(0, maxRunes - 1).join("")}…`;
  }
  return runes.slice(0, maxRunes).join("");
}

export function fallbackTitleFromUserMessage(text, maxRunes = FALLBACK_TITLE_MAX_RUNES) {
  const sanitized = sanitizeUserMessageForTitle(text);
  if (!sanitized) {
    return "";
  }
  return truncateRunes(sanitized, maxRunes, true);
}

export function resolveChatTitle(aiTitle, userMessage) {
  const normalized = normalizeAITitle(aiTitle);
  if (normalized) {
    return truncateRunes(normalized, MAX_CHAT_DISPLAY_NAME_RUNES, false);
  }
  return truncateRunes(fallbackTitleFromUserMessage(userMessage), MAX_CHAT_DISPLAY_NAME_RUNES, false);
}

export function getFirstUserMessageText(messages) {
  const message = (messages || []).find(
    (item) => item.author !== "AI" && !item.isHidden && (item.text || "").trim() !== ""
  );
  return message?.text || "";
}
