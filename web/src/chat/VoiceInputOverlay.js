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
import {AudioFilled} from "@ant-design/icons";
import {ThemeDefault} from "../Conf";
import i18next from "i18next";
import * as Setting from "../Setting";

const VoiceInputOverlay = ({onStop}) => {
  const baseUnit = Setting.isMobile() ? "vw" : "vh";
  const isDark = Setting.getIsDark();

  return (
    <div style={{
      position: "absolute",
      zIndex: "100",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div
        style={{
          padding: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "50" + baseUnit,
          height: "50" + baseUnit,
          backgroundColor: isDark ? "rgba(40, 40, 50, 0.9)" : "rgba(255, 255, 255, 0.8)",
        }}
        onClick={onStop}
      >
        <AudioFilled style={{
          fontSize: `10${baseUnit}`,
          color: ThemeDefault.colorPrimary,
          marginBottom: "10%",
        }} />
        <div style={{
          fontSize: "14px",
          color: ThemeDefault.colorPrimary,
          marginBottom: "5%",
          fontFamily: "Arial, sans-serif",
          fontWeight: "bold",
        }}>
          {i18next.t("chat:I'm listening...")}
        </div>
        <div style={{
          fontSize: "12px",
          color: ThemeDefault.colorPrimary,
          fontFamily: "Arial, sans-serif",
        }}>
          {i18next.t("chat:click to stop...")}
        </div>
      </div>
    </div>
  );
};

export default VoiceInputOverlay;
