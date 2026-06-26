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

import React from "react";
import i18next from "i18next";

const StatusStrip = ({message, isLastMessage, isGenerating, themeColor}) => {
  if (!isGenerating || !isLastMessage || message.author !== "AI" || message.errorText) {
    return null;
  }

  // Render the strip from the very start of generation so the same element
  // advances through "Preparing" -> "Generating answer with X" -> "Calling
  // tool: ..." instead of swapping with the dot animation once tokens arrive.
  const inProgressTool = message.toolCalls?.find(tc => !tc.content);
  const stripText = inProgressTool
    ? `${i18next.t("chat:Calling tool")}: ${inProgressTool.name}`
    : (message.statusText || i18next.t("chat:Thinking"));

  return (
    <div style={{
      marginBottom: "10px",
      color: themeColor,
      fontSize: "12px",
      fontWeight: 500,
    }}>
      <span>{stripText}</span>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          opacity: 0,
          animation: "statusStripDot 1.4s infinite",
          animationDelay: `${i * 0.2}s`,
        }}>.</span>
      ))}
      <style>{`
        @keyframes statusStripDot {
          0%, 100% { opacity: 0; }
          40%, 60% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StatusStrip;
