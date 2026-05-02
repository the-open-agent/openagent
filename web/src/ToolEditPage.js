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
import {Button, Card, Col, Input, Row, Select, Switch, Table, Tag} from "antd";
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

  renderTool() {
    return (
      <Card size="small" title={
        <div>
          {i18next.t("tool:Edit Tool")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitToolEdit(false)}>{i18next.t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitToolEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
          {this.state.isNewTool && <Button style={{marginLeft: "20px"}} onClick={() => this.cancelToolEdit()}>{i18next.t("general:Cancel")}</Button>}
        </div>
      } style={{marginLeft: "5px"}} type="inner">
        <Row style={{marginTop: "10px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Input value={this.state.tool.name} onChange={e => {
              this.updateToolField("name", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Select virtual={false} style={{width: "100%"}} value={this.state.tool.type} onChange={(value) => {
              this.updateToolField("type", value);
              if (value === "time") {
                this.updateToolField("subType", "Default");
              } else if (value === "web_search") {
                this.updateToolField("subType", "DuckDuckGo");
              } else if (value === "shell") {
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
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:Sub type"), i18next.t("provider:Sub type - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Select virtual={false} style={{width: "100%"}} value={this.state.tool.subType}
              onChange={(value) => this.updateToolField("subType", value)}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Setting.getProviderSubTypeOptions("Tool", this.state.tool.type)
                .map((item, index) => (
                  <Option key={index} value={item.id}>{item.name}</Option>
                ))
              }
            </Select>
          </Col>
        </Row>
        {Setting.getToolFunctions(this.state.tool).length > 0 && (
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("tool:Functions"), i18next.t("tool:Functions - Tooltip"))} :
            </Col>
            <Col span={22}>
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
                dataSource={Setting.getToolFunctions(this.state.tool).map((f, i) => ({...f, key: i}))}
              />
            </Col>
          </Row>
        )}
        {this.shouldShowClientIdInput(this.state.tool) ? (
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {this.getClientIdLabel(this.state.tool)} :
            </Col>
            <Col span={22}>
              <Input value={this.state.tool.clientId} onChange={e => {
                this.updateToolField("clientId", e.target.value);
              }} />
            </Col>
          </Row>
        ) : null}
        {this.shouldShowClientSecretInput(this.state.tool) ? (
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {this.getClientSecretLabel(this.state.tool)} :
            </Col>
            <Col span={22}>
              <Input.Password value={this.state.tool.clientSecret} onChange={e => {
                this.updateToolField("clientSecret", e.target.value);
              }} />
            </Col>
          </Row>
        ) : null}
        {["web_search", "web_fetch", "web_browser"].includes(this.state.tool.type) ? (
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {this.getProviderUrlLabel(this.state.tool)} :
            </Col>
            <Col span={22}>
              <Input value={this.state.tool.providerUrl} onChange={e => {
                this.updateToolField("providerUrl", e.target.value);
              }} />
            </Col>
          </Row>
        ) : null}
        {["web_search", "web_fetch", "web_browser", "browser_use"].includes(this.state.tool.type) ? (
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("provider:Enable proxy"), i18next.t("provider:Enable proxy - Tooltip"))} :
            </Col>
            <Col span={1}>
              <Switch checked={this.state.tool.enableProxy} onChange={checked => {
                this.updateToolField("enableProxy", checked);
              }} />
            </Col>
          </Row>
        ) : null}
        {this.state.tool.type === "browser_use" ? (
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("tool:Chrome mode"), i18next.t("tool:Chrome mode - Tooltip"))} :
            </Col>
            <Col span={22}>
              <Select virtual={false} style={{width: "100%"}} value={this.state.tool.mode || "User Chrome"}
                onChange={value => this.updateToolField("mode", value)}
              >
                <Option value="User Chrome">{i18next.t("tool:User Chrome")}</Option>
                <Option value="Chrome for Testing">{i18next.t("tool:Chrome for Testing")}</Option>
              </Select>
            </Col>
          </Row>
        ) : null}
        <TestToolWidget
          tool={this.state.tool}
          originalTool={this.state.originalTool}
          onUpdateTool={this.updateToolField.bind(this)}
          account={this.props.account}
        />
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip"))} :
          </Col>
          <Col span={22}>
            <Select virtual={false} style={{width: "100%"}} value={this.state.tool.state}
              onChange={value => this.updateToolField("state", value)}
              options={[
                {value: "Active", label: i18next.t("general:Active")},
                {value: "Inactive", label: i18next.t("general:Inactive")},
              ].map(item => Setting.getOption(item.label, item.value))} />
          </Col>
        </Row>
      </Card>
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
      <div>
        {
          this.state.tool !== null ? this.renderTool() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitToolEdit(false)}>{i18next.t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitToolEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
          {this.state.isNewTool && <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.cancelToolEdit()}>{i18next.t("general:Cancel")}</Button>}
        </div>
      </div>
    );
  }
}

export default ToolEditPage;
