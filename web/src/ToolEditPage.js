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
import {Alert, Button, Col, Input, Row, Select, Space, Switch, Table, Tag} from "antd";
import SectionCard from "./components/ui/section-card";
import * as ToolBackend from "./backend/ToolBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import TestToolWidget from "./common/TestToolWidget";

const {Option} = Select;

class ToolEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      toolName: props.match.params.toolName,
      tool: null,
      originalTool: null,
      isNewTool: props.location?.state?.isNewTool || false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getTool();
  }

  getTool() {
    ToolBackend.getTool("admin", this.state.toolName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            tool: res.data,
            originalTool: Setting.deepCopy(res.data),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  updateToolField(key, value) {
    const tool = this.state.tool;
    tool[key] = value;
    this.setState({tool});
  }

  shouldShowClientIdInput(tool) {
    return tool.type === "web_search" && tool.subType === "Google";
  }

  shouldShowClientSecretInput(tool) {
    return tool.type === "web_search" && ["Google", "Baidu"].includes(tool.subType);
  }

  getClientIdLabel(tool) {
    if (tool.type === "web_search" && tool.subType === "Google") {
      return Setting.getLabel(i18next.t("provider:Search engine ID (cx)"), i18next.t("provider:Search engine ID (cx) - Tooltip"));
    }
    return Setting.getLabel(i18next.t("provider:Client ID"), i18next.t("provider:Client ID - Tooltip"));
  }

  getClientSecretLabel(tool) {
    if (tool.type === "web_search") {
      return Setting.getLabel(i18next.t("provider:API key"), i18next.t("provider:API key - Tooltip"));
    }
    return Setting.getLabel(i18next.t("provider:Client secret"), i18next.t("provider:Client secret - Tooltip"));
  }

  getProviderUrlLabel(tool) {
    return Setting.getLabel(i18next.t("general:Provider URL"), i18next.t("general:Provider URL - Tooltip"));
  }

  renderToolField(label, control, span = 8, style = {}) {
    return (
      <Col style={{marginTop: "12px", ...style}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderToolSwitch(label, checked, onChange, span = 6) {
    return this.renderToolField(label, <Switch checked={checked} onChange={onChange} />, span);
  }

  renderTool() {
    const tool = this.state.tool;
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
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("tool:Edit Tool")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            <Space wrap>
              <Button style={btnStyle} onClick={() => this.submitToolEdit(false)}>{i18next.t("general:Save")}</Button>
              <Button style={btnStyle} onClick={() => this.submitToolEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
              {this.state.isNewTool && <Button style={btnStyle} onClick={() => this.cancelToolEdit()}>{i18next.t("general:Cancel")}</Button>}
            </Space>
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderToolField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={tool.name} onChange={e => {
                this.updateToolField("name", e.target.value);
              }} />,
              8
            )}
            {this.renderToolField(
              Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={tool.type} onChange={(value) => {
                this.updateToolField("type", value);
                if (value === "time") {
                  this.updateToolField("subType", "Default");
                } else if (value === "web_search") {
                  this.updateToolField("subType", "DuckDuckGo");
                } else if (value === "shell") {
                  this.updateToolField("subType", "Default");
                } else if (value === "local_file") {
                  this.updateToolField("subType", "Default");
                } else if (value === "office") {
                  this.updateToolField("subType", "All");
                } else if (value === "web_fetch") {
                  this.updateToolField("subType", "Default");
                } else if (value === "web_browser") {
                  this.updateToolField("subType", "Default");
                } else if (value === "gui") {
                  this.updateToolField("subType", "Windows UIA");
                } else if (value === "video_download") {
                  this.updateToolField("subType", "Default");
                } else if (value === "browser_use") {
                  this.updateToolField("subType", "Default");
                }
              }}
              showSearch
              filterOption={(input, option) =>
                option.children[1].toLowerCase().includes(input.toLowerCase())
              }
              >
                {
                  Setting.getProviderTypeOptions("Tool")
                    .map((item, index) => (
                      <Option key={index} value={item.name}>
                        <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}}
                          src={Setting.getProviderLogoURL({category: "Tool", type: item.name})} alt={item.name} />
                        {item.name}
                      </Option>
                    ))
                }
              </Select>,
              8
            )}
            {this.renderToolField(
              Setting.getLabel(i18next.t("provider:Sub type"), i18next.t("provider:Sub type - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={tool.subType}
                onChange={(value) => this.updateToolField("subType", value)}
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {Setting.getProviderSubTypeOptions("Tool", tool.type)
                  .map((item, index) => (
                    <Option key={index} value={item.id}>{item.name}</Option>
                  ))
                }
              </Select>,
              8
            )}
            {this.shouldShowClientIdInput(tool) ? (
              this.renderToolField(
                this.getClientIdLabel(tool),
                <Input value={tool.clientId} onChange={e => {
                  this.updateToolField("clientId", e.target.value);
                }} />,
                12
              )
            ) : null}
            {this.shouldShowClientSecretInput(tool) ? (
              this.renderToolField(
                this.getClientSecretLabel(tool),
                <Input.Password value={tool.clientSecret} onChange={e => {
                  this.updateToolField("clientSecret", e.target.value);
                }} />,
                12
              )
            ) : null}
            {["web_search", "web_fetch", "web_browser"].includes(tool.type) ? (
              this.renderToolField(
                this.getProviderUrlLabel(tool),
                <Input value={tool.providerUrl} onChange={e => {
                  this.updateToolField("providerUrl", e.target.value);
                }} />,
                12
              )
            ) : null}
            {["web_search", "web_fetch", "web_browser", "browser_use"].includes(tool.type) ? (
              this.renderToolSwitch(
                Setting.getLabel(i18next.t("provider:Enable proxy"), i18next.t("provider:Enable proxy - Tooltip")),
                tool.enableProxy,
                checked => {
                  this.updateToolField("enableProxy", checked);
                },
                6
              )
            ) : null}
            {tool.type === "browser_use" ? (
              this.renderToolField(
                Setting.getLabel(i18next.t("tool:Chrome mode"), i18next.t("tool:Chrome mode - Tooltip")),
                <Select virtual={false} style={{width: "100%"}} value={tool.mode || "User Chrome"}
                  onChange={value => this.updateToolField("mode", value)}
                >
                  <Option value="User Chrome">{i18next.t("tool:User Chrome")}</Option>
                  <Option value="Chrome for Testing">{i18next.t("tool:Chrome for Testing")}</Option>
                  <Option value="OpenAgent Chrome Extension">{i18next.t("tool:OpenAgent Chrome Extension")}</Option>
                </Select>,
                12
              )
            ) : null}
            {tool.type === "browser_use" && tool.mode === "OpenAgent Chrome Extension" ? (
              <Col span={24} style={{marginTop: "12px"}}>
                <Alert
                  type="info"
                  showIcon
                  message={i18next.t("tool:OpenAgent Chrome Extension - Setup title")}
                  description={
                    <ol style={{marginTop: "8px", marginBottom: "0", paddingLeft: "20px"}}>
                      <li>
                        {i18next.t("tool:OpenAgent Chrome Extension - Step 1 prefix")}
                        {" "}
                        <a href="https://github.com/the-open-agent/openagent-chrome" target="_blank" rel="noopener noreferrer">
                          {i18next.t("tool:OpenAgent Chrome Extension - Step 1 link")}
                        </a>
                      </li>
                      <li>{i18next.t("tool:OpenAgent Chrome Extension - Step 2")}</li>
                      <li>{i18next.t("tool:OpenAgent Chrome Extension - Step 3")}</li>
                      <li>{i18next.t("tool:OpenAgent Chrome Extension - Step 4")}</li>
                    </ol>
                  }
                />
              </Col>
            ) : null}
            {this.renderToolField(
              Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={tool.state}
                onChange={value => this.updateToolField("state", value)}
                options={[
                  {value: "Active", label: i18next.t("general:Active")},
                  {value: "Inactive", label: i18next.t("general:Inactive")},
                ].map(item => Setting.getOption(item.label, item.value))} />,
              8
            )}
          </Row>
        </SectionCard>

        {Setting.getToolFunctions(tool).length > 0 && (
          <SectionCard title={i18next.t("tool:Functions")} desc={i18next.t("tool:Functions desc")}>
            <Table
              size="small"
              pagination={false}
              columns={[
                {
                  title: i18next.t("tool:Function name"),
                  dataIndex: "name",
                  key: "name",
                  width: 280,
                  render: (text) => <Tag style={{fontFamily: "monospace"}}>{text}</Tag>,
                },
                {
                  title: i18next.t("general:Description"),
                  dataIndex: "description",
                  key: "description",
                },
              ]}
              dataSource={Setting.getToolFunctions(tool).map((f, i) => ({...f, key: i}))}
            />
          </SectionCard>
        )}

        <SectionCard title={i18next.t("general:Test")} desc={i18next.t("general:Test desc")}>
          <TestToolWidget
            tool={tool}
            originalTool={this.state.originalTool}
            onUpdateTool={this.updateToolField.bind(this)}
            account={this.props.account}
          />
        </SectionCard>
      </div>
    );
  }

  submitToolEdit(exitAfterSave) {
    const tool = Setting.deepCopy(this.state.tool);
    ToolBackend.updateTool(this.state.tool.owner, this.state.toolName, tool)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              toolName: this.state.tool.name,
              isNewTool: false,
            });

            if (exitAfterSave) {
              this.props.history.push("/tools");
            } else {
              this.props.history.push(`/tools/${this.state.tool.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updateToolField("name", this.state.toolName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelToolEdit() {
    if (this.state.isNewTool) {
      ToolBackend.deleteTool(this.state.tool)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/tools");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/tools");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {
          this.state.tool !== null ? this.renderTool() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
      </div>
    );
  }
}

export default ToolEditPage;
