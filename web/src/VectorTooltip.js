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

import React, {useEffect, useState} from "react";
import {AppTooltip} from "./components/ui/tooltip";
import * as Setting from "./Setting";
import * as VectorBackend from "./backend/VectorBackend";
import i18next from "i18next";

const VectorTooltip = ({vectorScore, children}) => {
  const [vectorData, setVectorData] = useState(null);

  useEffect(() => {
    const fetchVectorInfo = async() => {
      try {
        const res = await VectorBackend.getVector("admin", vectorScore.vector);
        if (res.status === "ok") {
          setVectorData(res.data);
        }
      } catch (error) {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      }
    };

    fetchVectorInfo();
  }, [vectorScore.vector]);

  const tooltipContent = () => {
    return (
      <div style={{width: "900px", maxWidth: "calc(100vw - 80px)", fontSize: "14px", padding: "5px", boxSizing: "border-box"}}>
        <div style={{display: "flex", gap: "5px", flexWrap: "wrap"}}>
          <span><strong>{i18next.t("general:Name")}:</strong> {vectorScore.vector}</span>
          <span><strong>{i18next.t("task:Score")}:</strong> {vectorScore.score}</span>
          <span><strong>{i18next.t("store:File")}:</strong> {vectorData?.file}</span>
        </div>
        <div style={{marginTop: 8, paddingTop: 8, borderTop: "1px solid #d9d9d9"}}>
          <div style={{maxHeight: "500px", overflow: "auto", fontSize: "13px", backgroundColor: "#f5f5f5", color: "#000000", padding: "8px", borderRadius: "4px", marginTop: "4px", whiteSpace: "pre-wrap", border: "3px solid #d9d9d9"}}>
            {vectorData?.text}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppTooltip title={tooltipContent()} placement="left" overlayStyle={{maxWidth: "none"}} overlayInnerStyle={{backgroundColor: "white", color: "black", maxWidth: "none"}}>
      {children}
    </AppTooltip>
  );
};

export default VectorTooltip;
