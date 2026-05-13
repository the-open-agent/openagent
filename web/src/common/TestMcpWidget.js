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
import {Button, Col, Input, InputNumber, Row, Select} from "antd";
import {Switch} from "../components/ui/switch";
import * as Setting from "../Setting";
import i18next from "i18next";
import * as ServerBackend from "../backend/ServerBackend";
import Editor from "./Editor";

class TestMcpWidget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      testButtonLoading: false,
      testResult: "",
      testToolName: "",
      testArgValues: {},
    };
  }

  async sendTestMcp() {
    const {server} = this.props;
    const {testToolName, testArgValues} = this.state;

    if (!testToolName) {
      Setting.showMessage("error", i18next.t("server:Please select a tool first"));
      return;
    }

    const tools = server.tools || [];
    const toolObj = tools.find(t => t.name === testToolName);
    let schema = {};
    if (toolObj && toolObj.inputSchema) {
      try {
        schema = JSON.parse(toolObj.inputSchema);
      } catch (_e) {
        // leave schema empty
      }
    }

    const args = {};
    for (const [k, v] of Object.entries(testArgValues)) {
      if (v === "" || v === undefined || v === null) {
        continue;
      }
      const prop = schema.properties?.[k];
      if (!prop) {
        args[k] = v;
        continue;
      }
      if (prop.type === "object" || prop.type === "array") {
        try {
          args[k] = JSON.parse(v);
        } catch (_e) {
          args[k] = v;
        }
      } else if (prop.type === "number" || prop.type === "integer") {
        args[k] = Number(v);
      } else {
        args[k] = v;
      }
    }

    const serverCopy = Setting.deepCopy(server);
    serverCopy.testContent = JSON.stringify({tool: testToolName, arguments: args});

    this.setState({testButtonLoading: true, testResult: ""});
    try {
      const res = await ServerBackend.testMcpServer(serverCopy);
      if (res.status === "ok") {
        const out = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
        this.setState({testResult: out});
        Setting.showMessage("success", i18next.t("general:Success"));
      } else {
        Setting.showMessage("error", res.msg || i18next.t("general:Failed to save"));
      }
    } catch (error) {
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error.message}`);
    } finally {
      this.setState({testButtonLoading: false});
    }
  }

  renderArgFields(schema) {
    const {testArgValues} = this.state;
    const properties = schema.properties || {};
    const requiredArgs = schema.required || [];

    return Object.entries(properties).map(([argName, argSchema]) => {
      const isRequired = requiredArgs.includes(argName);
      const type = argSchema.type || "string";
      let inputEl;
      if (type === "boolean") {
        inputEl = (
          <Switch
            checked={!!testArgValues[argName]}
            onCheckedChange={v => this.setState(prev => ({testArgValues: {...prev.testArgValues, [argName]: v}}))}
          />
        );
      } else if (type === "number" || type === "integer") {
        inputEl = (
          <InputNumber
            style={{width: "100%"}}
            value={testArgValues[argName] !== undefined ? testArgValues[argName] : undefined}
            onChange={v => this.setState(prev => ({testArgValues: {...prev.testArgValues, [argName]: v}}))}
          />
        );
      } else if (type === "array" || type === "object") {
        inputEl = (
          <Input.TextArea
            rows={3}
            placeholder="JSON..."
            value={testArgValues[argName] || ""}
            onChange={e => this.setState(prev => ({testArgValues: {...prev.testArgValues, [argName]: e.target.value}}))}
          />
        );
      } else {
        inputEl = (
          <Input
            value={testArgValues[argName] || ""}
            onChange={e => this.setState(prev => ({testArgValues: {...prev.testArgValues, [argName]: e.target.value}}))}
          />
        );
      }

      return (
        <Row key={argName} style={{marginTop: "8px"}} align="top">
          <Col span={5} style={{paddingTop: "5px", paddingRight: "8px", textAlign: "right"}}>
            <span style={{fontWeight: isRequired ? 600 : 400, color: isRequired ? "#c00" : "inherit"}}>
              {isRequired && "* "}{argName}
            </span>
            {argSchema.description && (
              <div style={{fontSize: "11px", color: "#888", marginTop: "2px"}}>{argSchema.description}</div>
            )}
          </Col>
          <Col span={19}>{inputEl}</Col>
        </Row>
      );
    });
  }

  render() {
    const {server} = this.props;
    if (!server) {
      return null;
    }

    const {testToolName, testButtonLoading, testResult} = this.state;
    const tools = server.tools || [];

    if (tools.length === 0) {
      return (
        <span style={{color: "#aaa", fontStyle: "italic"}}>
          {i18next.t("server:Sync tools first using the Sync button above")}
        </span>
      );
    }

    const toolOptions = tools.map(t => {
      let inputSchema = {};
      if (t.inputSchema) {
        try {
          inputSchema = JSON.parse(t.inputSchema);
        } catch (_e) {
          // ignore
        }
      }
      return {label: t.name, value: t.name, description: t.description, inputSchema};
    });

    const selectedToolOpt = toolOptions.find(t => t.value === testToolName);
    const currentSchema = selectedToolOpt?.inputSchema || {};
    const argFields = this.renderArgFields(currentSchema);

    return (
      <React.Fragment>
        <Row gutter={16} align="middle">
          <Col span={3} style={{textAlign: "right", paddingRight: "8px"}}>
            {i18next.t("general:Tool")}:
          </Col>
          <Col span={16}>
            <Select
              style={{width: "100%"}}
              placeholder={i18next.t("server:Select tool...")}
              value={testToolName || undefined}
              options={toolOptions}
              onChange={v => this.setState({testToolName: v, testArgValues: {}})}
              optionRender={opt => (
                <div>
                  <div style={{fontWeight: 500}}>{opt.value}</div>
                  {opt.data.description && (
                    <div style={{fontSize: "12px", color: "#888"}}>{opt.data.description}</div>
                  )}
                </div>
              )}
            />
          </Col>
        </Row>
        {argFields.length > 0 && (
          <div style={{marginTop: "12px", padding: "12px 16px", background: "#f5f5f5", borderRadius: "6px", border: "1px solid #e8e8e8"}}>
            <div style={{marginBottom: "8px", fontWeight: 500, color: "#555"}}>{i18next.t("chat:Arguments")}:</div>
            {argFields}
          </div>
        )}
        {testToolName && argFields.length === 0 && (
          <div style={{marginTop: "8px", color: "#888", fontStyle: "italic", fontSize: "12px"}}>
            {i18next.t("server:This tool takes no arguments")}
          </div>
        )}
        <Row style={{marginTop: "12px"}}>
          <Col>
            <Button
              type="primary"
              loading={testButtonLoading}
              disabled={!testToolName}
              onClick={() => this.sendTestMcp()}
            >
              {i18next.t("provider:Invoke MCP tool")}
            </Button>
          </Col>
        </Row>
        {testResult && (
          <div style={{marginTop: "12px"}}>
            <div style={{marginBottom: "5px"}}><strong>{i18next.t("provider:MCP tool result")}:</strong></div>
            <Editor value={testResult} lang="text" height="150px" dark readOnly />
          </div>
        )}
      </React.Fragment>
    );
  }
}

export default TestMcpWidget;
