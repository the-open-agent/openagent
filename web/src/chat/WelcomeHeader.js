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

import React from "react";
import {Welcome} from "@ant-design/x";
import * as Setting from "../Setting";
import i18next from "i18next";

const WelcomeHeader = ({store}) => {
  const avatar = (store === undefined) ? null : store.avatar || Setting.getDefaultAiAvatar();
  const isDark = Setting.getIsDark();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px 32px",
      flex: 1,
    }}>
      <Welcome
        variant="borderless"
        icon={avatar}
        title={(store === undefined) ? null : store.welcomeTitle || i18next.t("chat:Hello, I'm OpenAgent AI Assistant")}
        description={(store === undefined) ? null : store.welcomeText || i18next.t("chat:I'm here to help answer your questions")}
        style={{textAlign: "center"}}
        styles={{
          title: {fontSize: "22px", fontWeight: 600, letterSpacing: "-0.3px"},
          description: {fontSize: "15px", color: isDark ? "#6b7280" : "#888", marginTop: "6px"},
        }}
      />
    </div>
  );
};

export default WelcomeHeader;
