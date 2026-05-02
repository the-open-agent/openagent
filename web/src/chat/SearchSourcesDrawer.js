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

import React, {useState} from "react";
import {Drawer} from "antd";
import i18next from "i18next";
import * as Setting from "../Setting";

const SearchResultItem = ({result, idx, themeColor}) => {
  const [iconError, setIconError] = useState(false);
  const isDark = Setting.getIsDark();

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        padding: "12px",
        background: isDark ? "#1e2028" : "#fff",
        borderRadius: "8px",
        border: isDark ? "1px solid #383d47" : "1px solid #e8e8e8",
        cursor: "pointer",
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
      onClick={() => {
        if (result.url) {
          window.open(result.url, "_blank");
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && result.url) {
          e.preventDefault();
          window.open(result.url, "_blank");
        }
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "6px",
      }}>
        {result.icon && !iconError ? (
          <img
            src={result.icon}
            alt="site icon"
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
            onError={() => setIconError(true)}
          />
        ) : (
          <span style={{
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
          }}>
            {result.index || idx + 1}
          </span>
        )}
        <span style={{
          color: themeColor,
          fontSize: "12px",
          fontWeight: "500",
        }}>
          {result.site_name || (result.url ? new URL(result.url).hostname : "")}
        </span>
      </div>
      <div style={{
        fontSize: "14px",
        color: isDark ? "#e5e7eb" : "#333",
        marginBottom: "6px",
        fontWeight: "500",
        lineHeight: "1.4",
      }}>
        {result.title}
      </div>
      <div style={{
        fontSize: "12px",
        color: isDark ? "#6b7280" : "#999",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {result.url}
      </div>
    </div>
  );
};

const SearchSourcesDrawer = ({visible, onClose, searchResults}) => {
  const themeColor = Setting.getThemeColor();

  return (
    <Drawer
      title={i18next.t("chat:Web sources")}
      placement="right"
      width={"auto"}
      onClose={onClose}
      open={visible}
      styles={{
        body: {padding: "16px"},
      }}
    >
      {searchResults?.length > 0 && (
        <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
          {searchResults.map((result, idx) => (
            <SearchResultItem
              key={idx}
              result={result}
              idx={idx}
              themeColor={themeColor}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
};

export default SearchSourcesDrawer;
