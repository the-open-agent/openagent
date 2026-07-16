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
import {Alert, Button, Card, Col, Input, InputNumber, Row, Select, Space} from "antd";
import * as ToolPolicyBackend from "./backend/ToolPolicyBackend";
import * as Setting from "./Setting";
import i18next from "i18next";

class ToolPolicyEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      toolPolicyName: props.match.params.toolPolicyName,
      toolPolicy: null,
      isNewToolPolicy: props.location?.state?.isNewToolPolicy || false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getToolPolicy();
  }

  getToolPolicy() {
    ToolPolicyBackend.getToolPolicy("admin", this.state.toolPolicyName)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data === null) {
            // Policy not found (e.g. deleted or bad name): the backend returns ok
            // with null data. Don't leave the page spinning forever — report it
            // and return to the list.
            Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${this.state.toolPolicyName}`);
            this.props.history.push("/tool-policies");
            return;
          }
          this.setState({
            toolPolicy: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  updateToolPolicyField(key, value) {
    const toolPolicy = this.state.toolPolicy;
    toolPolicy[key] = value;
    this.setState({toolPolicy});
  }

  renderField(label, control, span = 8, style = {}) {
    return (
      <Col style={{marginTop: "12px", ...style}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderToolPolicy() {
    const toolPolicy = this.state.toolPolicy;
    const rowGutter = [16, 8];
    const cardHeadStyle = {background: "transparent", borderBottom: "none", fontWeight: 600, fontSize: "15px"};
    const sectionCardStyle = {
      marginBottom: "16px",
      borderRadius: "14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      padding: "18px",
    };

    const renderCardTitle = (title, desc) => (
      <div>
        <div style={{fontWeight: 600, fontSize: "15px"}}>{title}</div>
        <div style={{fontSize: "13px", color: "var(--ant-color-text-tertiary)", fontWeight: 400, marginTop: "2px"}}>{desc}</div>
      </div>
    );

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("toolPolicy:Edit Tool Permission")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            <Space wrap>
              <Button onClick={() => this.submitToolPolicyEdit(false)}>{i18next.t("general:Save")}</Button>
              <Button type="primary" onClick={() => this.submitToolPolicyEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
              {this.state.isNewToolPolicy && <Button onClick={() => this.cancelToolPolicyEdit()}>{i18next.t("general:Cancel")}</Button>}
            </Space>
          </div>
        </div>

        <Alert
          style={{marginBottom: "16px", borderRadius: "12px"}}
          type="info"
          showIcon
          message={i18next.t("toolPolicy:Matching help title")}
          description={i18next.t("toolPolicy:Matching help desc")}
        />

        <Card size="small" title={renderCardTitle(i18next.t("toolPolicy:Scope"), i18next.t("toolPolicy:Scope desc"))} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row gutter={rowGutter}>
            {this.renderField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={toolPolicy.name} onChange={e => this.updateToolPolicyField("name", e.target.value)} />,
              8
            )}
            {this.renderField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={toolPolicy.displayName} onChange={e => this.updateToolPolicyField("displayName", e.target.value)} />,
              8
            )}
            {this.renderField(
              Setting.getLabel(i18next.t("general:Store"), i18next.t("toolPolicy:Store match - Tooltip")),
              <Input placeholder="*" value={toolPolicy.store} onChange={e => this.updateToolPolicyField("store", e.target.value)} />,
              8
            )}
            {this.renderField(
              Setting.getLabel(i18next.t("store:Subject"), i18next.t("toolPolicy:Subject match - Tooltip")),
              <Input placeholder="*" value={toolPolicy.subject} onChange={e => this.updateToolPolicyField("subject", e.target.value)} />,
              8
            )}
          </Row>
        </Card>

        <Card size="small" title={renderCardTitle(i18next.t("toolPolicy:Match"), i18next.t("toolPolicy:Match desc"))} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row gutter={rowGutter}>
            {this.renderField(
              Setting.getLabel(i18next.t("general:Tool"), i18next.t("toolPolicy:Tool - Tooltip")),
              <Input placeholder="* / shell / office_*" value={toolPolicy.tool} onChange={e => this.updateToolPolicyField("tool", e.target.value)} />,
              8
            )}
            {this.renderField(
              Setting.getLabel(i18next.t("general:Category"), i18next.t("toolPolicy:Category match - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={toolPolicy.category || "*"}
                onChange={value => this.updateToolPolicyField("category", value)}
                options={["*", "read", "write", "exec", "network", "sensitive", "unknown"].map(v => Setting.getOption(v, v))} />,
              8
            )}
            {this.renderField(
              Setting.getLabel(i18next.t("toolPolicy:Resource"), i18next.t("toolPolicy:Resource - Tooltip")),
              <Input placeholder="* / *rm -rf* / https://*.example.com/*" value={toolPolicy.resource} onChange={e => this.updateToolPolicyField("resource", e.target.value)} />,
              16
            )}
          </Row>
        </Card>

        <Card size="small" title={renderCardTitle(i18next.t("toolPolicy:Decision"), i18next.t("toolPolicy:Decision desc"))} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row gutter={rowGutter}>
            {this.renderField(
              Setting.getLabel(i18next.t("toolPolicy:Effect"), i18next.t("toolPolicy:Effect - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={toolPolicy.effect || "deny"}
                onChange={value => this.updateToolPolicyField("effect", value)}
                options={[
                  {value: "allow", label: i18next.t("toolPolicy:allow")},
                  {value: "ask", label: i18next.t("toolPolicy:ask")},
                  {value: "deny", label: i18next.t("toolPolicy:deny")},
                ].map(item => Setting.getOption(item.label, item.value))} />,
              8
            )}
            {this.renderField(
              Setting.getLabel(i18next.t("toolPolicy:Priority"), i18next.t("toolPolicy:Priority - Tooltip")),
              <InputNumber style={{width: "100%"}} value={toolPolicy.priority} onChange={value => this.updateToolPolicyField("priority", value || 0)} />,
              8
            )}
            {this.renderField(
              Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={toolPolicy.state}
                onChange={value => this.updateToolPolicyField("state", value)}
                options={[
                  {value: "Active", label: i18next.t("general:Active")},
                  {value: "Disabled", label: i18next.t("general:Disabled")},
                ].map(item => Setting.getOption(item.label, item.value))} />,
              8
            )}
          </Row>
        </Card>
      </div>
    );
  }

  submitToolPolicyEdit(exitAfterSave) {
    const toolPolicy = Setting.deepCopy(this.state.toolPolicy);
    ToolPolicyBackend.updateToolPolicy(this.state.toolPolicy.owner, this.state.toolPolicyName, toolPolicy)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          this.setState({
            toolPolicyName: this.state.toolPolicy.name,
            isNewToolPolicy: false,
          });

          if (exitAfterSave) {
            this.props.history.push("/tool-policies");
          } else {
            this.props.history.push(`/tool-policies/${this.state.toolPolicy.name}`);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelToolPolicyEdit() {
    if (this.state.isNewToolPolicy) {
      ToolPolicyBackend.deleteToolPolicy(this.state.toolPolicy)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/tool-policies");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/tool-policies");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {
          this.state.toolPolicy !== null ? this.renderToolPolicy() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
      </div>
    );
  }
}

export default ToolPolicyEditPage;
