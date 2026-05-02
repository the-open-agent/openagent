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
import {Button, Input, Space, Tooltip} from "antd";
import {CheckOutlined, CloseOutlined, EditOutlined} from "@ant-design/icons";
import i18next from "i18next";

// Styles for edit components
export const editStyles = {
  // Edit form styles
  editForm: {
    width: "100%",
  },

  // TextArea styles in edit form
  editTextArea: {
    marginBottom: "8px",
  },

  // Button container in edit form
  editFormButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },
};

const MessageEdit = ({
  message,
  isLastMessage,
  disableInput,
  index,
  onEditMessage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  // Edit action handlers
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
      }
    },
  };

  // Edit form component
  const renderEditForm = () => (
    <div style={editStyles.editForm}>
      <Input.TextArea
        value={editedText}
        onChange={e => setEditedText(e.target.value)}
        onKeyDown={handleEditActions.keyDown}
        autoSize={{minRows: 1, maxRows: 6}}
        style={editStyles.editTextArea}
        autoFocus
      />
      <Space style={editStyles.editFormButtons}>
        <Button
          icon={<CloseOutlined />}
          onClick={handleEditActions.cancel}
          size="small"
        >
          {i18next.t("general:Cancel")}
        </Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={handleEditActions.save}
          size="small"
        >
          {i18next.t("general:Save")}
        </Button>
      </Space>
    </div>
  );

  // Edit button component
  const renderEditButton = () => {
    if (message.author !== "AI" && !isEditing && (disableInput === false || index !== isLastMessage)) {
      return (
        <Tooltip title={i18next.t("general:Edit")} arrow={false}>
          <Button
            icon={<EditOutlined />}
            color="primary"
            variant="text"
            onClick={handleEditActions.start}
          />
        </Tooltip>
      );
    }
    return null;
  };

  // Return the editing state and render functions
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
