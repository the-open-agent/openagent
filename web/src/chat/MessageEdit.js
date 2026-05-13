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

import {AppTooltip} from "../components/ui/tooltip";
import React, {useState} from "react";
import {Button, Input} from "antd";
import {CheckOutlined, CloseOutlined, EditOutlined} from "@ant-design/icons";
import i18next from "i18next";

const MessageEdit = ({
  message,
  isLastMessage,
  disableInput,
  hideInput,
  index,
  onEditMessage,
  isDark,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  const handleEditActions = {
    start: () => {
      setIsEditing(true);
      setEditedText(message.text);
    },
    save: () => {
      onEditMessage({...message, text: editedText, updatedTime: new Date().toISOString()});
      setIsEditing(false);
    },
    cancel: () => {
      setIsEditing(false);
      setEditedText("");
    },
    keyDown: (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleEditActions.save();
      } else if (e.key === "Escape") {
        handleEditActions.cancel();
      }
    },
  };

  const renderEditForm = () => {
    const containerStyle = {
      width: "100%",
      maxWidth: "480px",
      marginLeft: "auto",
      background: isDark ? "#1e2130" : "#ffffff",
      border: isDark ? "1px solid #2e3347" : "1px solid #e2e8f0",
      borderRadius: "14px 14px 4px 14px",
      padding: "12px 14px",
      boxShadow: isDark
        ? "0 4px 16px rgba(0,0,0,0.45)"
        : "0 4px 16px rgba(0,0,0,0.08)",
    };

    const textareaStyle = {
      background: isDark ? "#252a3a" : "#f7f9fc",
      borderColor: isDark ? "#363d52" : "#dde3ed",
      color: isDark ? "#dde3f0" : "#2d3748",
      borderRadius: "8px",
      fontSize: "14px",
      lineHeight: "1.6",
      resize: "none",
      transition: "border-color 0.2s",
    };

    return (
      <div style={containerStyle}>
        <Input.TextArea
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          onKeyDown={handleEditActions.keyDown}
          autoSize={{minRows: 2, maxRows: 8}}
          style={textareaStyle}
          autoFocus
        />
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
        }}>
          <span style={{
            fontSize: "11px",
            color: isDark ? "#5a6480" : "#a0aec0",
            userSelect: "none",
          }}>
            Enter {i18next.t("general:Save")} · Esc {i18next.t("general:Cancel")}
          </span>
          <div style={{display: "flex", gap: "8px"}}>
            <Button
              size="small"
              icon={<CloseOutlined style={{fontSize: "11px"}} />}
              onClick={handleEditActions.cancel}
              style={{
                borderRadius: "20px",
                paddingInline: "12px",
                height: "28px",
                background: "transparent",
                borderColor: isDark ? "#3d4560" : "#d1d8e4",
                color: isDark ? "#8896b0" : "#718096",
                fontSize: "12px",
              }}
            >
              {i18next.t("general:Cancel")}
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined style={{fontSize: "11px"}} />}
              onClick={handleEditActions.save}
              style={{
                borderRadius: "20px",
                paddingInline: "12px",
                height: "28px",
                fontSize: "12px",
              }}
            >
              {i18next.t("general:Save")}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditButton = () => {
    if (message.author !== "AI" && !isEditing && !hideInput && (disableInput === false || index !== isLastMessage)) {
      return (
        <AppTooltip title={i18next.t("general:Edit")} arrow={false}>
          <Button
            icon={<EditOutlined />}
            color="primary"
            variant="text"
            onClick={handleEditActions.start}
          />
        </AppTooltip>
      );
    }
    return null;
  };

  return {
    isEditing,
    isHovering,
    editedText,
    setIsHovering,
    renderEditForm,
    renderEditButton,
    handleMouseEnter: () => setIsHovering(true),
    handleMouseLeave: () => setIsHovering(false),
  };
};

export default MessageEdit;
