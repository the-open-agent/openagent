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
import {Col, Input, Row, Space} from "antd";
import i18next from "i18next";
import * as Setting from "./Setting";
import CopyButton from "./common/CopyButton";
import {getOpenAiCompatibleBaseUrl, getOpenAiCompatibleChatCompletionsUrl} from "./OpenAiCompatibleSetting";

function ReadOnlyCopyInput({value}) {
  return (
    <Input
      readOnly
      value={value}
      addonAfter={<CopyButton value={value} />}
    />
  );
}

function OpenAiCompatibleConfig({apiKey, apiKeyLabel, apiKeyDisabled = false, onApiKeyChange, hint}) {
  const baseUrl = getOpenAiCompatibleBaseUrl();
  const chatCompletionsUrl = getOpenAiCompatibleChatCompletionsUrl();

  return (
    <div style={{marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--ant-color-border-secondary)"}}>
      <Space direction="vertical" size={4} style={{width: "100%"}}>
        <div style={{fontWeight: 600}}>{i18next.t("general:OpenAI compatible API")}</div>
        <div style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>{hint}</div>
      </Space>
      <Row gutter={16}>
        <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : 8}>
          <div style={{marginBottom: "4px"}}>{apiKeyLabel || i18next.t("general:API key")}</div>
          <Input.Password
            value={apiKey}
            disabled={apiKeyDisabled}
            addonAfter={<CopyButton value={apiKey} disabled={apiKeyDisabled} />}
            onChange={onApiKeyChange}
          />
        </Col>
        <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : 8}>
          <div style={{marginBottom: "4px"}}>{i18next.t("general:Base URL")}</div>
          <ReadOnlyCopyInput value={baseUrl} />
        </Col>
        <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : 8}>
          <div style={{marginBottom: "4px"}}>{i18next.t("general:Chat completions endpoint")}</div>
          <ReadOnlyCopyInput value={chatCompletionsUrl} />
        </Col>
      </Row>
    </div>
  );
}

export default OpenAiCompatibleConfig;
