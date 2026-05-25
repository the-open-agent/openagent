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

import React, {useMemo, useState} from "react";
import {Alert, Descriptions, Modal, Typography} from "antd";
import i18next from "i18next";
import * as Setting from "../Setting";
import * as WebsiteKnowledgeBackend from "../backend/WebsiteKnowledgeBackend";

function inferHostname(message) {
  for (const tc of message?.toolCalls || []) {
    try {
      if (tc.name === "browser_use_open" && tc.arguments) {
        const url = JSON.parse(tc.arguments).url;
        if (url) {
          return new URL(url).hostname.replace(/^www\./, "");
        }
      }
      if (tc.name === "browser_use_run_steps" && tc.arguments) {
        for (const step of JSON.parse(tc.arguments).steps || []) {
          if (step?.op === "open" && step.url) {
            return new URL(step.url).hostname.replace(/^www\./, "");
          }
        }
      }
    } catch (_) {
      // ignore malformed tool data
    }
  }
  for (const tc of message?.toolCalls || []) {
    if (!tc.content || !tc.name?.startsWith("browser_use_")) {
      continue;
    }
    const match = String(tc.content).match(/URL:\s*(https?:\/\/[^\s\\]+)/);
    if (match?.[1]) {
      return new URL(match[1]).hostname.replace(/^www\./, "");
    }
  }
  return "";
}

const SaveWebsiteKnowledgeModal = ({open, message, onClose, onSaved}) => {
  const [loading, setLoading] = useState(false);
  const hostname = useMemo(() => inferHostname(message), [message]);
  const toolCallCount = (message?.toolCalls || []).filter(tc => tc.name?.startsWith("browser_use_")).length;

  const handleLearn = async() => {
    try {
      setLoading(true);
      const res = await WebsiteKnowledgeBackend.learnFromMessage({messageOwner: message.owner, messageName: message.name});
      if (res.status === "ok") {
        const playbook = res.data.playbook || {};
        Setting.showMessage("success", `${i18next.t("websiteKnowledge:Successfully updated website memory")} (${i18next.t("websiteKnowledge:Memory save summary", {elementCount: Object.keys(playbook.elements || {}).length, pageCount: Object.keys(playbook.pages || {}).length})})`);
        onSaved?.(res.data);
        onClose?.();
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    } catch (error) {
      if (!error?.errorFields) {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={i18next.t("websiteKnowledge:Save to website memory")} open={open} onOk={handleLearn} confirmLoading={loading} onCancel={onClose} okText={i18next.t("general:Save")} cancelText={i18next.t("general:Cancel")}>
      <Alert type="info" showIcon style={{marginBottom: 16}} message={i18next.t("websiteKnowledge:Website memory save hint")} />
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={i18next.t("websiteKnowledge:Site")}><Typography.Text code>{hostname || i18next.t("general:Unknown")}</Typography.Text></Descriptions.Item>
        <Descriptions.Item label={i18next.t("websiteKnowledge:Observed browser steps")}>{toolCallCount}</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default SaveWebsiteKnowledgeModal;
