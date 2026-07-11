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

import i18n from "i18next";
import zh from "./locales/zh/data.json";
import en from "./locales/en/data.json";
import ko from "./locales/ko/data.json";
import {initReactI18next} from "react-i18next";

const resources = {
  en: en,
  zh: zh,
  ko: ko,
};

const supportedLanguages = ["en", "zh", "ko"];

function initLanguage() {
  let language = localStorage.getItem("language");
  if (language === undefined || language === null) {
    const userLanguage = navigator.language;
    switch (userLanguage) {
    case "en":
      language = "en";
      break;
    case "en-US":
      language = "en";
      break;
    case "zh-CN":
      language = "zh";
      break;
    case "zh":
      language = "zh";
      break;
    case "ko":
      language = "ko";
      break;
    case "ko-KR":
      language = "ko";
      break;
    default:
      language = "en";
    }
  }

  if (!supportedLanguages.includes(language)) {
    language = "en";
  }

  return language;
}

i18n.use(initReactI18next).init({
  lng: initLanguage(),

  resources: resources,

  fallbackLng: "en",
  supportedLngs: supportedLanguages,

  keySeparator: false,

  interpolation: {
    escapeValue: false,
  },
  // debug: true,
  saveMissing: true,
});

export default i18n;
