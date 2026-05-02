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
import {Button} from "antd";
import {Sender} from "@ant-design/x";
import {CloseOutlined, GlobalOutlined} from "@ant-design/icons";
import ChatFileInput from "./ChatFileInput";
import UploadFileArea from "./UploadFileArea";
import ChatInputMenu from "./ChatInputMenu";
import * as Setting from "../Setting";
import i18next from "i18next";

const ChatInput = React.forwardRef(({
  value,
  store,
  chat,
  files,
  onFileChange,
  onChange,
  onSend,
  loading,
  disableInput,
  messageError,
  onCancelMessage,
  onVoiceInputStart,
  onVoiceInputEnd,
  isVoiceInput,
  webSearchEnabled,
  onWebSearchChange,
}, ref) => {
  const senderRef = React.useRef(null);
  React.useImperativeHandle(ref, () => ({
    focus: () => senderRef.current?.focus(),
  }));

  const sendButtonDisabled = messageError || (value === "" && files.length === 0) || disableInput;

  async function handleInputChange(file) {
    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const originalWidth = img.width;
          const originalHeight = img.height;
          const inputMaxWidth = 70;
          const chatMaxWidth = 600;
          let Ratio = 1;
          if (originalWidth > inputMaxWidth) {
            Ratio = inputMaxWidth / originalWidth;
          }
          if (originalWidth > chatMaxWidth) {
            Ratio = chatMaxWidth / originalWidth;
          }
          const chatScaledWidth = Math.round(originalWidth * Ratio);
          const chatScaledHeight = Math.round(originalHeight * Ratio);
          const value = `<img src="${img.src}" alt="${img.alt}" width="${chatScaledWidth}" height="${chatScaledHeight}">`;
          updateFileList(file, img.src, value);
        };
        img.src = e.target.result;
      };
    } else {
      reader.onload = (e) => {
        const content = `<a href="${e.target.result}" target="_blank">${file.name}</a>`;
        const value = e.target.result;
        updateFileList(file, content, value);
      };
    }
    reader.readAsDataURL(file);
  }

  function handleFileUploadClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*, .txt, .md, .yaml, .csv, .docx, .pdf, .xlsx";
    input.multiple = false;
    input.style.display = "none";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        handleInputChange(file);
      }
    };
    input.click();
  }

  function updateFileList(file, content, value) {
    const uploadedFile = {
      uid: Date.now() + Math.random(),
      file: file,
      content: content,
      value: value,
    };
    onFileChange(
      [...files, uploadedFile]
    );
  }

  // const isSpeechDisabled = store?.speechToTextProvider === "";
  const isSpeechDisabled = false;

  const isDark = Setting.getIsDark();

  return (
    <div style={{position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 24px 16px", zIndex: 1}}>
      <UploadFileArea onFileChange={handleInputChange} />
      <div style={{maxWidth: "700px", margin: "0 auto"}}>
        {files.length > 0 && (
          <div style={{marginBottom: "10px", marginLeft: "4px", marginRight: "4px"}}>
            <ChatFileInput files={files} onFileChange={onFileChange} />
          </div>
        )}
        {webSearchEnabled && (
          <div style={{marginBottom: "10px", marginLeft: "4px"}}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px 4px 12px",
              background: isDark ? "#2a2a2a" : "#eef2ff",
              borderRadius: "20px",
              fontSize: "12px",
              color: Setting.getThemeColor(),
              border: `1px solid ${Setting.getThemeColor()}33`,
            }}>
              <GlobalOutlined style={{fontSize: "12px"}} />
              <span style={{fontWeight: 500}}>{i18next.t("chat:Web search")}</span>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined style={{fontSize: "9px"}} />}
                style={{
                  minWidth: "auto",
                  width: "18px",
                  height: "18px",
                  padding: 0,
                  marginLeft: "1px",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.7,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onWebSearchChange && onWebSearchChange(false);
                }}
              />
            </div>
          </div>
        )}
        <div style={{
          borderRadius: "16px",
          boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.08)",
          overflow: "hidden",
          border: isDark ? "1px solid #333" : "1px solid #e8eaed",
        }}>
          <Sender
            ref={senderRef}
            prefix={
              <ChatInputMenu
                disabled={disableInput || messageError}
                webSearchEnabled={webSearchEnabled}
                onWebSearchChange={onWebSearchChange}
                onFileUpload={handleFileUploadClick}
                disableFileUpload={store?.disableFileUpload}
                store={store}
                chat={chat}
              />
            }
            loading={loading}
            disabled={disableInput}
            style={{flex: 1, borderRadius: "16px", background: isDark ? "#1a1a1a" : "#fff", border: "none", boxShadow: "none"}}
            placeholder={messageError ? "" : i18next.t("chat:Type message here")}
            value={(files.length > 0 && value === "") ? " " + value : value}
            onChange={onChange}
            onSubmit={() => {
              if (!sendButtonDisabled) {
                onSend(value, webSearchEnabled);
                onChange("");
              }
            }}
            onCancel={() => {
              onCancelMessage && onCancelMessage();
            }}
            {...(!isSpeechDisabled ? {
              allowSpeech: {
                recording: isVoiceInput,
                onRecordingChange: (nextRecording) => {
                  if (nextRecording) {
                    onVoiceInputStart();
                  } else {
                    onVoiceInputEnd();
                  }
                },
              },
            } : {})}
          />
        </div>
      </div>
    </div>
  );
});

export default ChatInput;
