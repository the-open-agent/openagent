// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
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
import {Spin} from "antd";
import {CheckCircleFilled, CodeOutlined, DownOutlined, LoadingOutlined} from "@ant-design/icons";
import i18next from "i18next";
import Editor from "../common/Editor";

/* ── Helpers ──────────────────────────────────────────────────── */

function renderJsonContent(raw) {
  let text = raw;
  try {
    text = JSON.stringify(JSON.parse(raw), null, 2);
  } catch (_) {
    // not JSON, render as-is
  }
  return (
    <Editor
      value={text}
      lang="json"
      dark
      readOnly
      editable={false}
      fillWidth
      lineNumbers={false}
      lineWrapping
    />
  );
}

/* ── ToolCallCard ─────────────────────────────────────────────── */

export const ToolCallCard = ({toolCall, isDark, themeColor, isLast}) => {
  const isExecuting = !toolCall.content;
  const [expanded, setExpanded] = useState(isExecuting);

  const border = isDark ? "1px solid #2a2e3d" : "1px solid #e6eaf4";
  const bg = isDark ? "#191c26" : "#f7f9fd";
  const labelColor = isDark ? "#565e78" : "#9aa3b8";
  const nameColor = isDark ? "#dde3f5" : "#1a2340";

  return (
    <div
      style={{
        borderRadius: "10px",
        border,
        background: bg,
        overflow: "hidden",
        marginBottom: isLast ? 0 : "8px",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* ── Header row ── */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "9px 13px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Icon */}
        <div style={{
          width: "28px",
          height: "28px",
          borderRadius: "7px",
          background: `${themeColor}1a`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <CodeOutlined style={{color: themeColor, fontSize: "13px"}} />
        </div>

        {/* Tool name */}
        <span style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "13px",
          fontWeight: 600,
          color: nameColor,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {toolCall.name}
        </span>

        {/* Status badge */}
        {isExecuting ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: isDark ? "#22273a" : "#eff2fa",
            borderRadius: "20px",
            padding: "3px 9px 3px 7px",
            flexShrink: 0,
          }}>
            <Spin indicator={<LoadingOutlined style={{fontSize: "11px", color: themeColor}} spin />} />
            <span style={{fontSize: "11px", color: labelColor, fontWeight: 500, lineHeight: 1}}>
              {i18next.t("chat:Executing...")}
            </span>
          </div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: isDark ? "#162516" : "#f0faf1",
            borderRadius: "20px",
            padding: "3px 9px 3px 7px",
            flexShrink: 0,
          }}>
            <CheckCircleFilled style={{fontSize: "11px", color: "#4ade80"}} />
            <span style={{fontSize: "11px", color: isDark ? "#4ade80" : "#16a34a", fontWeight: 500, lineHeight: 1}}>
              {i18next.t("chat:Done")}
            </span>
          </div>
        )}

        {/* Chevron */}
        <DownOutlined style={{
          fontSize: "10px",
          color: labelColor,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
          flexShrink: 0,
        }} />
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{
          borderTop: isDark ? "1px solid #22263a" : "1px solid #eaeef8",
          padding: "10px 13px 12px",
        }}>
          {toolCall.arguments && (
            <div style={{marginBottom: toolCall.content ? "10px" : 0}}>
              <div style={{
                fontSize: "10px",
                fontWeight: 700,
                color: labelColor,
                textTransform: "uppercase",
                letterSpacing: "0.7px",
                marginBottom: "5px",
              }}>
                {i18next.t("chat:Arguments")}
              </div>
              {renderJsonContent(toolCall.arguments)}
            </div>
          )}
          {toolCall.content ? (
            <div>
              <div style={{
                fontSize: "10px",
                fontWeight: 700,
                color: labelColor,
                textTransform: "uppercase",
                letterSpacing: "0.7px",
                marginBottom: "5px",
              }}>
                {i18next.t("general:Result")}
              </div>
              {renderJsonContent(toolCall.content)}
            </div>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: labelColor,
              fontSize: "12px",
              padding: "4px 0",
            }}>
              <Spin indicator={<LoadingOutlined style={{fontSize: "11px", color: themeColor}} spin />} />
              <span>{i18next.t("chat:Executing...")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── ToolCallSection ──────────────────────────────────────────── */
// Renders the full tool-calls block (section label + all cards).
// Drop this into any message renderer that receives a toolCalls array.

const ToolCallSection = ({toolCalls, isDark, themeColor}) => {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const labelColor = isDark ? "#565e78" : "#9aa3b8";

  return (
    <div style={{marginBottom: "14px"}}>
      {/* Section label */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        marginBottom: "8px",
        color: labelColor,
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}>
        <CodeOutlined style={{fontSize: "11px"}} />
        <span>
          {`${toolCalls.length} ${i18next.t("chat:Tool calls")}`}
        </span>
      </div>

      {/* Tool cards */}
      {toolCalls.map((toolCall, idx) => (
        <ToolCallCard
          key={idx}
          toolCall={toolCall}
          isDark={isDark}
          themeColor={themeColor}
          isLast={idx === toolCalls.length - 1}
        />
      ))}
    </div>
  );
};

export default ToolCallSection;
