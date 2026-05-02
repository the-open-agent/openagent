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

export const DefaultColorPrimary = "#404040";

export const AuthConfig = {serverUrl: "", clientId: "", appName: "", organizationName: "", redirectPath: ""};
export let EnableExtraPages = false;
export let ShortcutPageItems = [];
export let UsageEndpoints = [];
export let IframeUrl = "";
export let ForceLanguage = "";
export let DefaultLanguage = "";
export let StaticBaseUrl = "";
export let HtmlTitle = "";
export let FaviconUrl = "";
export let LogoUrl = "";
export let NavbarHtml = "";
export let FooterHtml = "";
export let AppUrl = "";
export let ShowGithubCorner = false;
export let IsDemoMode = false;
// eslint-disable-next-line
export let ThemeDefault = {
  themeType: "default",
  colorPrimary: DefaultColorPrimary,
  borderRadius: 10,
  isCompact: false,
};
export let AvatarErrorUrl = "";

export function setConfig(config) {
  if (config === null || config === undefined) {
    return;
  }

  if (config.authConfig) {
    Object.assign(AuthConfig, config.authConfig);
  }

  if (config.enableExtraPages !== undefined) {EnableExtraPages = config.enableExtraPages;}
  if (config.shortcutPageItems) {ShortcutPageItems = config.shortcutPageItems;}
  if (config.usageEndpoints) {UsageEndpoints = config.usageEndpoints;}
  if (config.iframeUrl !== undefined) {IframeUrl = config.iframeUrl;}
  if (config.forceLanguage !== undefined) {ForceLanguage = config.forceLanguage;}
  if (config.defaultLanguage !== undefined) {DefaultLanguage = config.defaultLanguage;}
  if (config.staticBaseUrl !== undefined) {StaticBaseUrl = config.staticBaseUrl;}
  if (config.htmlTitle !== undefined) {HtmlTitle = config.htmlTitle;}
  if (config.faviconUrl !== undefined) {FaviconUrl = config.faviconUrl;}
  if (config.logoUrl !== undefined) {LogoUrl = config.logoUrl;}
  if (config.navbarHtml !== undefined) {NavbarHtml = config.navbarHtml;}
  if (config.footerHtml !== undefined) {FooterHtml = config.footerHtml;}
  if (config.appUrl !== undefined) {AppUrl = config.appUrl;}
  if (config.showGithubCorner !== undefined) {ShowGithubCorner = config.showGithubCorner;}

  if (config.isDemoMode !== undefined) {
    IsDemoMode = config.isDemoMode;
  }

  if (config.themeDefault) {
    Object.assign(ThemeDefault, config.themeDefault);
  }

  if (config.avatarErrorUrl !== undefined) {AvatarErrorUrl = config.avatarErrorUrl;}
}
