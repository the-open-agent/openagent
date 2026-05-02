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
import {Drawer, Spin} from "antd";
import i18next from "i18next";
import {createFromIconfontCN} from "@ant-design/icons";
import * as Setting from "../Setting";
import * as VectorBackend from "../backend/VectorBackend";

const IconFont = createFromIconfontCN({
  scriptUrl: "https://cdn.open-ct.com/icon/iconfont.js",
});

const KnowledgeSourceItem = ({vectorScore, vectorData, idx, themeColor, account}) => {
  const isDark = Setting.getIsDark();
  if (!vectorData) {
    return null;
  }

  const handleClick = () => {
    const selection = window.getSelection();
    const url = `/vectors/${vectorScore.vector}${Setting.isLocalAdminUser(account) ? "" : "?mode=view"}`;
    if (selection.toString().length > 0) {
      return;
    }

    if (vectorScore.vector) {
      Setting.openLink(url);
    }
  };

  const handleFileOpen = (e) => {
    e.stopPropagation();
    if (vectorData.store && vectorData.file) {
      const fileKey = encodeURIComponent(vectorData.file.replace(/^\/+/, ""));
      Setting.openLink(`/stores/${vectorData.owner || "admin"}/${vectorData.store}/view?fileKey=${fileKey}`);
    }
  };

  return (
    <div
      style={{
        padding: "12px",
        background: isDark ? "#1e2028" : "#fff",
        borderRadius: "8px",
        border: isDark ? "1px solid #383d47" : "1px solid #e8e8e8",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = isDark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.1)";
        e.currentTarget.style.borderColor = themeColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = isDark ? "#383d47" : "#e8e8e8";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            background: themeColor,
            color: "#fff",
            borderRadius: "50%",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onClick={handleClick}
        >
          {idx + 1}
        </span>
        <span
          style={{
            fontSize: "20px",
            color: isDark ? "#9ca3af" : "#666",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={handleFileOpen}
        >
          <IconFont type={Setting.getFileIconType(vectorData.file)} />
        </span>
        <span
          style={{
            color: themeColor,
            fontSize: "13px",
            fontWeight: "500",
            flex: 1,
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={handleFileOpen}
        >
          {vectorData.file || i18next.t("chat:Knowledge Fragment")}
        </span>
        <span style={{
          padding: "2px 8px",
          background: isDark ? "#2d3139" : "#f0f0f0",
          borderRadius: "4px",
          fontSize: "12px",
          color: isDark ? "#9ca3af" : "#666",
          fontWeight: "500",
        }}>
          {i18next.t("chat:Relevance")}: {(vectorScore.score * 100).toFixed(1)}%
        </span>
      </div>
      <div
        style={{
          fontSize: "13px",
          color: isDark ? "#9ca3af" : "#666",
          lineHeight: "1.5",
          whiteSpace: "pre-line",
          wordBreak: "break-word",
          maxHeight: "800px",
          overflow: "auto",
          maxWidth: "800px",
          minWidth: "400px",
          cursor: "pointer",
        }}
        onClick={handleClick}
      >
        {vectorData.text}
      </div>
    </div>
  );
};

const KnowledgeSourcesDrawer = ({visible, onClose, vectorScores, account}) => {
  const [loading, setLoading] = useState(false);
  const [vectorsData, setVectorsData] = useState({});
  const themeColor = Setting.getThemeColor();

  useEffect(() => {
    const loadVectorsData = async() => {
      setLoading(true);
      const newVectorsData = {};

      try {
        for (const vectorScore of vectorScores) {
          if (!vectorScore.vector || typeof vectorScore.vector !== "string") {
            continue; // Skip invalid vector IDs
          }
          // Use "admin" as owner, same as VectorTooltip.js
          const result = await VectorBackend.getVector("admin", vectorScore.vector);
          if (result.status === "ok" && result.data) {
            newVectorsData[vectorScore.vector] = result.data;
          }
        }
        setVectorsData(newVectorsData);
      } catch (error) {
        // Failed to load vectors data
        Setting.showMessage("error", i18next.t("chat:Unable to load knowledge base sources. Please try again."));
      } finally {
        setLoading(false);
      }
    };

    if (visible && vectorScores && vectorScores.length > 0) {
      loadVectorsData();
    }
  }, [visible, vectorScores]);

  return (
    <Drawer
      title={i18next.t("chat:Knowledge sources")}
      placement="right"
      width={"auto"}
      onClose={onClose}
      open={visible}
      styles={{
        body: {padding: "16px"},
      }}
    >
      {loading ? (
        <div style={{textAlign: "center", padding: "20px"}}>
          <Spin />
        </div>
      ) : (
        vectorScores?.length > 0 && (
          <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            {vectorScores.map((vectorScore, idx) => (
              <KnowledgeSourceItem
                key={vectorScore.vector}
                vectorScore={vectorScore}
                vectorData={vectorsData[vectorScore.vector]}
                idx={idx}
                themeColor={themeColor}
                account={account}
              />
            ))}
          </div>
        )
      )}
    </Drawer>
  );
};

export default KnowledgeSourcesDrawer;
