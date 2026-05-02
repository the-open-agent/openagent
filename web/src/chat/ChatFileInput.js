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
import {Image} from "antd";
import {CloseCircleOutlined, FileTextOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";

const ChatFileInput = ({
  files,
  onFileChange,
}) => {
  const isDark = Setting.getIsDark();

  function handleRemoveFile(uid) {
    onFileChange(
      files.filter(file => file.uid !== uid)
    );
  }

  function renderFilePreview(uploadedFile) {
    const isImage = uploadedFile.file.type.startsWith("image/");
    if (isImage) {
      return (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"}}>
          <Image
            src={uploadedFile.content} width={50} height={50} style={{objectFit: "cover", borderRadius: 4}}
          />
          <div
            style={{fontSize: 10, textAlign: "center", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}
            title={uploadedFile.file.name}
          >
            {uploadedFile.file.name}
          </div>
        </div>
      );
    } else {
      return (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "4px"}}>
          <div
            style={{width: 50, height: 50, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: isDark ? "#2a2a2a" : "#f5f5f5"}}
          >
            <FileTextOutlined style={{fontSize: 30, color: isDark ? "#aaa" : "#666"}} />
          </div>
          <div
            style={{fontSize: 10, textAlign: "center", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}
            title={uploadedFile.file.name}
          >
            {uploadedFile.file.name}
          </div>
        </div>
      );
    }
  }

  return (
    <div
      style={{display: "flex", gap: 10, flexWrap: "wrap"}}
    >
      {files.map((uploadedFile) => (
        <div
          key={uploadedFile.uid}
          style={{position: "relative"}}
        >
          {renderFilePreview(uploadedFile)}
          <CloseCircleOutlined
            onClick={() => handleRemoveFile(uploadedFile.uid)}
            style={{position: "absolute", top: -6, right: -6, color: "red", fontSize: 16, cursor: "pointer", background: isDark ? "#1a1a1a" : "#fff", borderRadius: "50%"}}
          />
        </div>
      ))}
    </div>
  );
};

export default ChatFileInput;
