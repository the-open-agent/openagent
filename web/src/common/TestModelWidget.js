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

import React from "react";
import {Col, Row} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import ChatWidget from "./ChatWidget";

class ModelTestWidget extends React.Component {
  render() {
    const {provider, originalProvider, account} = this.props;

    if (!provider || provider.category !== "Model") {
      return null;
    }

    const stableName = originalProvider?.name || provider.name;

    return (
      <React.Fragment>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:Provider test"), i18next.t("provider:Provider test - Tooltip"))} :
          </Col>
          <Col span={20}>
            <ChatWidget
              key={stableName}
              chatName={`chat_${stableName}`}
              displayName={provider.displayName || provider.name}
              category="ModelTest"
              modelProvider={provider.name}
              modelProviderLocked={true}
              lockedModelProviderInfo={provider}
              account={account}
              height="600px"
              showHeader={true}
              showNewChatButton={true}
            />
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}

export default ModelTestWidget;
