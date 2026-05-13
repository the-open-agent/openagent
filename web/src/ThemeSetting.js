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

import {Tag, theme} from "antd";
import {AppTooltip} from "./components/ui/tooltip";
import {QuestionCircleOutlined, SyncOutlined} from "@ant-design/icons";
import React from "react";
import i18next from "i18next";
import {StaticBaseUrl, ThemeDefault} from "./Conf";
import * as Conf from "./Conf";
import Identicon from "identicon.js";
import md5 from "md5";
import {getShortText} from "./SettingUtil";

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

export function getDefaultAiAvatar() {
  return `${StaticBaseUrl}/img/openagent.png`;
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

export function setLanguage(language) {
  localStorage.setItem("language", language);
  i18next.changeLanguage(language);
}

export function setThemeColor(color) {
  if (!color) {
    return;
  }
  localStorage.setItem("themeColor", color);
  updateTheme(color);
}

export function getThemeColor() {
  return localStorage.getItem("themeColor") ?? "";
}

export function getAcceptLanguage() {
  if (i18next.language === null || i18next.language === "") {
    return "en;q=0.9,en;q=0.8";
  }
  return i18next.language + ";q=0.9,en;q=0.8";
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
      <AppTooltip placement="top" title={i18next.t("store:Read")}>
        <Tag icon={icon} style={style} color={"success"}>
          {text}
        </Tag>
      </AppTooltip>
    );
  } else if (type === "Write") {
    return (
      <AppTooltip placement="top" title={i18next.t("store:Write")}>
        <Tag icon={icon} style={style} color={"processing"}>
          {text}
        </Tag>
      </AppTooltip>
    );
  } else if (type === "Admin") {
    return (
      <AppTooltip placement="top" title={i18next.t("general:Admin")}>
        <Tag icon={icon} style={style} color={"error"}>
          {text}
        </Tag>
      </AppTooltip>
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
      <AppTooltip placement="top" title={getShortText(JSON.stringify(label.text), 500)}>
        <Tag color={"processing"}>
          {`${label.startTime}: ${label.text !== "" ? label.text : "(Empty)"}`}
        </Tag>
      </AppTooltip>
    );
  });
  return res;
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
  if (price === null || price === undefined) {
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

export function getLabel(text, tooltip) {
  return (
    <React.Fragment>
      <span style={{marginRight: 4}}>{text}</span>
      <AppTooltip placement="top" title={tooltip}>
        <QuestionCircleOutlined style={{color: "var(--ant-color-text-secondary)"}} />
      </AppTooltip>
    </React.Fragment>
  );
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

export function getStoreIconUrl(store) {
  if (!store) {
    return getDefaultAiAvatar();
  }
  return store.avatar || getDefaultAiAvatar();
}

export function getLogo(themes, storeLogoUrl) {
  const defaultLogoUrl = "https://cdn.openagentai.org/img/openagent-logo_1900x450.png";
  let logoUrl = Conf.LogoUrl || defaultLogoUrl;
  if (storeLogoUrl && storeLogoUrl !== defaultLogoUrl) {
    logoUrl = storeLogoUrl;
  }
  if (Conf.StaticBaseUrl) {
    logoUrl = logoUrl.replace("https://cdn.openagentai.org", Conf.StaticBaseUrl);
  }
  if (themes.includes("dark")) {
    return logoUrl.replace(/\.png$/, "_white.png");
  } else {
    return logoUrl;
  }
}

export function getNavbarHtml(themes, storeNavbarHtml) {
  let navbarHtml = Conf.NavbarHtml;
  if (storeNavbarHtml) {
    navbarHtml = storeNavbarHtml;
  }
  navbarHtml = navbarHtml.replace("https://cdn.openagentai.org", Conf.StaticBaseUrl);
  if (themes.includes("dark")) {
    return navbarHtml.replace(/(\.png)/g, "_white$1");
  } else {
    return navbarHtml;
  }
}

export function getFooterHtml(themes, storeFooterHtml, site) {
  const logoUrl = getLogo("", site?.logoUrl);
  const defaultFooterHtml = `<a target="_blank" href="https://github.com/the-open-agent/openagent" rel="noreferrer"><img style="padding-bottom: 3px;" height="30" alt="OpenAgent" src="${logoUrl}" /></a>`;
  const isDefaultFooter = !storeFooterHtml || storeFooterHtml.includes("/img/openagent-logo_1900x450.png");
  let footerHtml = isDefaultFooter ? (Conf.FooterHtml || defaultFooterHtml) : storeFooterHtml;
  footerHtml = footerHtml.replace("https://cdn.openagentai.org", Conf.StaticBaseUrl);
  if (themes.includes("dark")) {
    return footerHtml.replace(/(\.png)/g, "_white$1");
  } else {
    return footerHtml;
  }
}
