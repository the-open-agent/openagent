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
import Loading from "./common/Loading";
import {Button, Col, Input, Row, Space} from "antd";
import SectionCard from "./components/ui/section-card";
import {LinkOutlined} from "@ant-design/icons";
import * as ServerBackend from "./backend/ServerBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import ToolTable from "./table/ToolTable";
import TestMcpWidget from "./common/TestMcpWidget";

class ServerEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      serverName: props.match.params.serverName,
      server: null,
      originalServer: null,
      isNewServer: props.location?.state?.isNewServer || false,
      syncButtonLoading: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getServer();
  }

  getServer() {
    ServerBackend.getServer("admin", this.state.serverName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            server: res.data,
            originalServer: Setting.deepCopy(res.data),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  updateServerField(key, value) {
    const server = this.state.server;
    server[key] = value;
    this.setState({server});
  }

  submitServerEdit(willExist) {
    const server = Setting.deepCopy(this.state.server);
    ServerBackend.updateServer(this.state.originalServer.owner, this.state.originalServer.name, server)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          this.setState({originalServer: Setting.deepCopy(this.state.server)});
          if (willExist) {
            this.props.history.push("/servers");
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  cancelServerEdit() {
    ServerBackend.deleteServer(this.state.server)
      .then(() => {
        this.props.history.push("/servers");
      });
  }

  syncMcpTool(isCleared) {
    const server = Setting.deepCopy(this.state.server);
    this.setState({syncButtonLoading: true});
    ServerBackend.syncMcpTool(this.state.originalServer.owner, this.state.originalServer.name, server, isCleared)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          this.getServer();
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      })
      .finally(() => {
        this.setState({syncButtonLoading: false});
      });
  }

  renderServerField(label, control, span = 8, style = {}) {
    return (
      <Col style={{marginTop: "12px", ...style}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderServer() {
    const server = this.state.server;
    const rowGutter = [16, 8];
    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("server:Edit MCP Server")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            <Space wrap>
              <Button style={btnStyle} onClick={() => this.submitServerEdit(false)}>{i18next.t("general:Save")}</Button>
              <Button style={btnStyle} onClick={() => this.submitServerEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
              {this.state.isNewServer && <Button style={btnStyle} onClick={() => this.cancelServerEdit()}>{i18next.t("general:Cancel")}</Button>}
            </Space>
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderServerField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={server.name} onChange={e => this.updateServerField("name", e.target.value)} />,
              8
            )}
            {this.renderServerField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={server.displayName} onChange={e => this.updateServerField("displayName", e.target.value)} />,
              8
            )}
            {this.renderServerField(
              Setting.getLabel(i18next.t("general:URL"), i18next.t("general:URL - Tooltip")),
              <Input prefix={<LinkOutlined />} value={server.url} onChange={e => this.updateServerField("url", e.target.value)} />,
              16
            )}
            {this.renderServerField(
              Setting.getLabel(i18next.t("server:Access token"), i18next.t("server:Access token - Tooltip")),
              <Input.Password placeholder={"***"} value={server.token} onChange={e => this.updateServerField("token", e.target.value)} />,
              16
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Tools")} desc={i18next.t("general:Tools desc")}>
          {!this.state.isNewServer && (
            <div style={{marginBottom: "8px"}}>
              <Button type="primary" loading={this.state.syncButtonLoading} onClick={() => this.syncMcpTool(false)}>{i18next.t("general:Sync")}</Button>
              <Button style={{marginLeft: "10px"}} onClick={() => this.syncMcpTool(true)}>{i18next.t("general:Clear")}</Button>
            </div>
          )}
          <ToolTable
            tools={server.tools || []}
            onUpdateTable={(value) => this.updateServerField("tools", value)}
          />
        </SectionCard>

        <SectionCard title={i18next.t("general:Test")} desc={i18next.t("general:Test desc")}>
          <TestMcpWidget server={server} />
          <Row gutter={rowGutter}>
            {this.renderServerField(
              Setting.getLabel(i18next.t("server:Base URL"), i18next.t("server:Base URL - Tooltip")),
              <Input prefix={<LinkOutlined />} readOnly value={`${window.location.origin}/api/get-server?id=${server.owner}/${server.name}`} />,
              24
            )}
          </Row>
        </SectionCard>
      </div>
    );
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.server === null ? <Loading /> : this.renderServer()}
      </div>
    );
  }
}

export default ServerEditPage;
