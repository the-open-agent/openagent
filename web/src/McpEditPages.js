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
import Loading from "./common/Loading";
import {Button, Card, Col, Input, Row, Select, Switch} from "antd";
import * as McpBackend from "./backend/McpBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import McpToolsTable from "./table/McpToolsTable";
import TestMcpWidget from "./common/TestMcpWidget";
import Editor from "./common/Editor";

class McpEditPages extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      providerName: props.match.params.providerName,
      provider: null,
      originalProvider: null,
      refreshButtonLoading: false,
      isNewProvider: props.location?.state?.isNewProvider || false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getProvider();
  }

  getProvider() {
    McpBackend.getMcp("admin", this.state.providerName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            provider: res.data,
            originalProvider: Setting.deepCopy(res.data),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  parseProviderField(key, value) {
    return value;
  }

  updateProviderField(key, value) {
    value = this.parseProviderField(key, value);
    const provider = this.state.provider;
    provider[key] = value;
    this.setState({provider});
  }

  updateMcpToolsField(key, value) {
    const provider = this.state.provider;
    provider[key] = value;
    this.setState({provider});
  }

  shouldShowProviderDisplayName2Field() {
    const lang = Setting.getLanguage();
    if (!lang || lang === "null") {
      return false;
    }
    return lang !== "en" && !lang.startsWith("en-");
  }

  refreshMcpTools() {
    this.setState({refreshButtonLoading: true});
    const provider = Setting.deepCopy(this.state.provider);
    provider.mcpTools = [];
    McpBackend.refreshMcpTools(provider)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          this.setState({
            provider: res.data,
          }, () => {
            this.submitProviderEdit(false);
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
          this.setState({provider});
        }
      })
      .catch((error) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
        this.setState({provider});
      })
      .finally(() => {
        this.setState({refreshButtonLoading: false});
      });
  }

  submitProviderEdit(exitAfterSave) {
    const provider = Setting.deepCopy(this.state.provider);
    McpBackend.updateMcp(this.state.provider.owner, this.state.providerName, provider)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              providerName: this.state.provider.name,
              isNewProvider: false,
            });

            if (exitAfterSave) {
              this.props.history.push("/mcp");
            } else {
              this.props.history.push(`/mcp/${this.state.provider.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updateProviderField("name", this.state.providerName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelProviderEdit() {
    if (this.state.isNewProvider) {
      McpBackend.deleteMcp(this.state.provider)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/mcp");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/mcp");
    }
  }

  renderMcp() {
    const provider = this.state.provider;
    const isRemote = provider?.isRemote;

    return (
      <Card style={{margin: "20px"}}>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input disabled={isRemote} value={provider.name} onChange={e => {
              this.updateProviderField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input disabled={isRemote} value={provider.displayName} onChange={e => {
              this.updateProviderField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        {this.shouldShowProviderDisplayName2Field() && (
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("general:Display name 2"), i18next.t("general:Display name 2 - Tooltip"))} :
            </Col>
            <Col span={22}>
              <Input disabled={isRemote} value={provider.displayName2} onChange={e => {
                this.updateProviderField("displayName2", e.target.value);
              }} />
            </Col>
          </Row>
        )}
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:MCP servers"), i18next.t("provider:MCP servers - Tooltip"))} :
          </Col>
          <Col span={10}>
            <div style={{height: "500px"}}>
              <Editor
                editable={!isRemote}
                value={provider.text}
                lang="json"
                fillHeight
                dark
                onChange={value => {
                  this.updateProviderField("text", value);
                }}
              />
            </div>
            <br />
            <Button disabled={isRemote} loading={this.state.refreshButtonLoading} style={{marginBottom: "10px"}} type="primary" onClick={() => {
              this.refreshMcpTools();
            }}>
              {i18next.t("provider:Refresh MCP tools")}
            </Button>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:MCP tools"), i18next.t("provider:MCP tools - Tooltip"))} :
          </Col>
          <Col span={22}>
            <McpToolsTable
              title={i18next.t("provider:MCP tools")}
              table={provider.mcpTools}
              onUpdateTable={(value) => {
                this.updateMcpToolsField("mcpTools", value);
              }}
            />
          </Col>
        </Row>
        <TestMcpWidget
          provider={provider}
          originalProvider={this.state.originalProvider}
          onUpdateProvider={this.updateProviderField.bind(this)}
        />
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:Is remote"), i18next.t("provider:Is remote - Tooltip"))} :
          </Col>
          <Col span={1}>
            <Switch disabled checked={provider.isRemote} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Select virtual={false} disabled={isRemote} style={{width: "100%"}} value={provider.state} onChange={value => {
              this.updateProviderField("state", value);
            }}
            options={[
              {value: "Active", label: i18next.t("general:Active")},
              {value: "Inactive", label: i18next.t("general:Inactive")},
            ].map(item => Setting.getOption(item.label, item.value))} />
          </Col>
        </Row>
      </Card>
    );
  }

  render() {
    const isRemote = this.state.provider?.isRemote;
    return (
      <div>
        {this.state.provider !== null ? this.renderMcp() : <Loading type="page" tip={i18next.t("general:Loading")} />}
        {!isRemote && this.state.provider && (
          <div style={{marginTop: "20px", marginLeft: "40px"}}>
            <Button size="large" onClick={() => this.submitProviderEdit(false)}>{i18next.t("general:Save")}</Button>
            <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitProviderEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
            {this.state.isNewProvider && <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.cancelProviderEdit()}>{i18next.t("general:Cancel")}</Button>}
          </div>
        )}
      </div>
    );
  }
}

export default McpEditPages;
