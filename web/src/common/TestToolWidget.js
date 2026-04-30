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
import {Button, Col, Row, Select} from "antd";
import * as Setting from "../Setting";
import i18next from "i18next";
import * as ToolBackend from "../backend/ToolBackend";
import * as ProviderBackend from "../backend/ProviderBackend";
import Editor from "./Editor";
import ChatWidget from "./ChatWidget";

const {Option} = Select;

const GUI_TOOL_CONTENT = {
  "win_open_application": JSON.stringify({tool: "win_open_application", arguments: {target: "calc", method: "auto", wait_seconds: 2}}, null, 2),
  "win_focus_window": JSON.stringify({tool: "win_focus_window", arguments: {title_contains: "Calculator"}}, null, 2),
  "win_find_element": JSON.stringify({tool: "win_find_element", arguments: {window_title_contains: "Calculator", control_type: "button", name_contains: "1"}}, null, 2),
  "win_interact": JSON.stringify({tool: "win_interact", arguments: {action: "click", element_id: "el_1"}}, null, 2),
  "win_wait": JSON.stringify({tool: "win_wait", arguments: {window_title_contains: "Calculator", timeout_seconds: 10}}, null, 2),
  "win_assert": JSON.stringify({tool: "win_assert", arguments: {check: "window_exists", window_title_contains: "Calculator"}}, null, 2),
  "win_read_system_metric": JSON.stringify({tool: "win_read_system_metric", arguments: {metric: "cpu_percent", duration_seconds: 10, interval_seconds: 1, aggregation: "avg"}}, null, 2),
  "win_word_write_and_save": JSON.stringify({tool: "win_word_write_and_save", arguments: {content: "CPU avg: 12.34%", file_name: "CPU_Report.docx", overwrite: true}}, null, 2),
  "win_safety_emergency_stop": JSON.stringify({tool: "win_safety_emergency_stop", arguments: {}}, null, 2),
};

const GUI_TOOL_OPTIONS = [
  {value: "win_open_application", label: "win_open_application — Launch app"},
  {value: "win_focus_window", label: "win_focus_window — Focus top-level window"},
  {value: "win_find_element", label: "win_find_element — Find UIA element by criteria"},
  {value: "win_interact", label: "win_interact — click/set_text/get_text/hotkey"},
  {value: "win_wait", label: "win_wait — Wait by time/window condition"},
  {value: "win_assert", label: "win_assert — Assert window/file/text condition"},
  {value: "win_read_system_metric", label: "win_read_system_metric — Read CPU metric"},
  {value: "win_word_write_and_save", label: "win_word_write_and_save — Legacy Word fallback"},
  {value: "win_safety_emergency_stop", label: "win_safety_emergency_stop — Emergency stop"},
];

const OFFICE_TOOL_CONTENT = {
  "All": JSON.stringify({tool: "word_read", arguments: {path: "/path/to/document.docx"}}, null, 2),
  "Word Read": JSON.stringify({tool: "word_read", arguments: {path: "/path/to/document.docx"}}, null, 2),
  "Word Write": JSON.stringify({tool: "word_write", arguments: {path: "/path/to/output.docx", content: "Hello, World!\nThis is a new paragraph."}}, null, 2),
  "Excel Read": JSON.stringify({tool: "excel_read", arguments: {path: "/path/to/spreadsheet.xlsx", sheet: "Sheet1"}}, null, 2),
  "Excel Write": JSON.stringify({tool: "excel_write", arguments: {path: "/path/to/output.xlsx", data: "Name,Age\nAlice,30\nBob,25", sheet: "Sheet1"}}, null, 2),
  "PowerPoint Read": JSON.stringify({tool: "pptx_read", arguments: {path: "/path/to/presentation.pptx"}}, null, 2),
  "PowerPoint Write": JSON.stringify({tool: "pptx_write", arguments: {path: "/path/to/output.pptx", slides: ["Slide 1 title\nSlide 1 content", "Slide 2 title\nSlide 2 content"]}}, null, 2),
};

const VIDEO_DOWNLOAD_TOOL_CONTENT = {
  "video_info": JSON.stringify({tool: "video_info", arguments: {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}, null, 2),
  "video_download": JSON.stringify({tool: "video_download", arguments: {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", output_dir: "/tmp/videos", format: "bestvideo+bestaudio/best"}}, null, 2),
  "video_audio_extract": JSON.stringify({tool: "video_audio_extract", arguments: {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", output_dir: "/tmp/audio", audio_format: "mp3", audio_quality: "0"}}, null, 2),
};

const VIDEO_DOWNLOAD_TOOL_OPTIONS = [
  {value: "video_info", label: "video_info — Get video metadata (no download)"},
  {value: "video_download", label: "video_download — Download video file"},
  {value: "video_audio_extract", label: "video_audio_extract — Extract audio from video"},
];

const DEFAULT_TOOL_CONTENT = {
  time: JSON.stringify({tool: "time", arguments: {operation: "current", timezone: "Asia/Shanghai"}}, null, 2),
  web_search: JSON.stringify({tool: "web_search", arguments: {query: "OpenAgent web search", count: 3, language: "en", country: "us"}}, null, 2),
  shell: JSON.stringify({tool: "shell", arguments: {command: "echo hello"}}, null, 2),
  web_fetch: JSON.stringify({tool: "web_fetch", arguments: {url: "https://casibase.org", max_length: 3000}}, null, 2),
  web_browser: JSON.stringify({tool: "web_browser", arguments: {url: "https://casibase.org", timeout: 60}}, null, 2),
  gui: JSON.stringify({tool: "win_open_application", arguments: {target: "calc", method: "auto", wait_seconds: 2}}, null, 2),
  video_download: JSON.stringify({tool: "video_info", arguments: {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}, null, 2),
  browser_use: JSON.stringify({tool: "browser_use_open", arguments: {url: "https://casibase.org"}}, null, 2),
};

function tryFormatJson(str) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch (e) {
    return str;
  }
}

function isValidToolTestJson(content) {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed.tool === "string" && parsed.tool.trim() !== "";
  } catch (e) {
    return false;
  }
}

function buildDefaultToolTestJson(tool) {
  if (tool.type === "office") {
    const subType = tool.subType || "All";
    return OFFICE_TOOL_CONTENT[subType] || OFFICE_TOOL_CONTENT["All"];
  }
  if (DEFAULT_TOOL_CONTENT[tool.type]) {
    return DEFAULT_TOOL_CONTENT[tool.type];
  }
  return JSON.stringify({tool: "", arguments: {}}, null, 2);
}

class TestToolWidget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      testButtonLoading: false,
      testResult: "",
      modelProviders: [],
      modelProvidersLoading: false,
      lastSyncedType: props.tool ? (props.tool.type || null) : null,
      lastSyncedSubType: props.tool ? (props.tool.subType || null) : null,
      selectedGuiTool: "win_open_application",
      selectedVideoTool: "video_info",
    };
  }

  componentDidMount() {
    this.syncFromTool(this.props.tool);
    this.loadModelProviders();
  }

  componentDidUpdate() {
    const {tool} = this.props;
    if (!tool) {
      return;
    }

    const currentType = tool.type || null;
    if (currentType !== this.state.lastSyncedType) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({lastSyncedType: currentType, lastSyncedSubType: tool.subType || null, testResult: ""});
      if (this.props.onUpdateTool) {
        this.props.onUpdateTool("testContent", buildDefaultToolTestJson(tool));
      }
      return;
    }

    if (tool.type === "office") {
      const currentSubType = tool.subType || null;
      if (currentSubType !== this.state.lastSyncedSubType) {
        // eslint-disable-next-line react/no-did-update-set-state
        this.setState({lastSyncedSubType: currentSubType});
        if (this.props.onUpdateTool) {
          this.props.onUpdateTool("testContent", buildDefaultToolTestJson(tool));
        }
        return;
      }
    }

    if (this.state.modelProviders.length === 0 && !this.state.modelProvidersLoading) {
      this.loadModelProviders();
    }
  }

  loadModelProviders() {
    this.setState({modelProvidersLoading: true});
    ProviderBackend.getProviders("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({modelProviders: res.data.filter(p => p.category === "Model"), modelProvidersLoading: false});
        } else {
          this.setState({modelProvidersLoading: false});
        }
      });
  }

  syncFromTool(tool) {
    const {onUpdateTool} = this.props;
    if (!tool) {
      return;
    }
    const needsDefault = !tool.testContent ||
      tool.testContent.trim() === "" ||
      !isValidToolTestJson(tool.testContent);
    if (needsDefault && onUpdateTool) {
      onUpdateTool("testContent", buildDefaultToolTestJson(tool));
    } else if (onUpdateTool && tool.testContent) {
      const formatted = tryFormatJson(tool.testContent);
      if (formatted !== tool.testContent) {
        onUpdateTool("testContent", formatted);
      }
    }
    if (tool.resultSummary) {
      this.setState({testResult: tool.resultSummary});
    }
    if (tool.type === "gui" && this.state.selectedGuiTool.startsWith("gui_")) {
      this.setState({selectedGuiTool: "win_open_application"});
    }
  }

  async sendTestTool(tool, originalTool) {
    let parsed;
    try {
      parsed = JSON.parse(tool.testContent);
    } catch (e) {
      Setting.showMessage("error", `${i18next.t("provider:Invalid tool test JSON")}: ${e.message}`);
      return;
    }
    if (!parsed || typeof parsed.tool !== "string" || parsed.tool.trim() === "") {
      Setting.showMessage("error", i18next.t("provider:Tool test JSON must include tool"));
      return;
    }

    this.setState({testButtonLoading: true, testResult: ""});

    try {
      const res = await ToolBackend.testTool(tool);
      if (res.status === "ok") {
        let out;
        if (typeof res.data === "string") {
          try {
            out = JSON.stringify(JSON.parse(res.data), null, 2);
          } catch (e) {
            out = res.data;
          }
        } else {
          out = JSON.stringify(res.data, null, 2);
        }
        this.setState({testResult: out});
        Setting.showMessage("success", i18next.t("general:Success"));
        if (this.props.onUpdateTool) {
          this.props.onUpdateTool("resultSummary", out);
        }
        await ToolBackend.updateTool(tool.owner, tool.name, {...tool, resultSummary: out});
      } else {
        Setting.showMessage("error", res.msg || i18next.t("general:Failed to save"));
      }
    } catch (error) {
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error.message}`);
    } finally {
      this.setState({testButtonLoading: false});
    }
  }

  render() {
    const {tool, originalTool, onUpdateTool, account} = this.props;
    const {modelProviders} = this.state;
    const selectedModelProvider = tool.modelProvider || "";

    if (!tool) {
      return null;
    }

    return (
      <React.Fragment>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:Tool test"), i18next.t("provider:Tool test JSON - Tooltip"))} :
          </Col>
          <Col span={10}>
            {tool.type === "gui" && (
              <div style={{marginBottom: "8px"}}>
                <div style={{marginBottom: "4px"}}>
                  {Setting.getLabel(i18next.t("provider:Tool function"), i18next.t("provider:Tool function - Tooltip"))} :
                </div>
                <Select
                  style={{width: "100%"}}
                  value={this.state.selectedGuiTool}
                  onChange={(value) => {
                    this.setState({selectedGuiTool: value});
                    onUpdateTool("testContent", GUI_TOOL_CONTENT[value]);
                  }}
                >
                  {GUI_TOOL_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </div>
            )}
            {tool.type === "video_download" && (
              <div style={{marginBottom: "8px"}}>
                <div style={{marginBottom: "4px"}}>
                  {Setting.getLabel(i18next.t("provider:Tool function"), i18next.t("provider:Tool function - Tooltip"))} :
                </div>
                <Select
                  style={{width: "100%"}}
                  value={this.state.selectedVideoTool}
                  onChange={(value) => {
                    this.setState({selectedVideoTool: value});
                    onUpdateTool("testContent", VIDEO_DOWNLOAD_TOOL_CONTENT[value]);
                  }}
                >
                  {VIDEO_DOWNLOAD_TOOL_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
              </div>
            )}
            <Editor
              value={tool.testContent}
              lang="json"
              height="150px"
              dark
              onChange={value => {onUpdateTool("testContent", value);}}
            />
          </Col>
          <Col span={6}>
            <Button
              style={{marginLeft: "10px", marginBottom: "5px"}}
              type="primary"
              loading={this.state.testButtonLoading}
              disabled={!tool.testContent || tool.testContent.trim() === ""}
              onClick={() => this.sendTestTool(tool, originalTool)}
            >
              {i18next.t("provider:Invoke tool")}
            </Button>
          </Col>
        </Row>
        <Row style={{marginTop: "10px"}}>
          <Col span={2}></Col>
          <Col span={10}>
            <div style={{marginBottom: "5px"}}><strong>{i18next.t("provider:Tool result")}:</strong></div>
            <Editor
              value={this.state.testResult}
              lang="json"
              height="150px"
              dark
              readOnly
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:Chat test"), i18next.t("provider:Chat test - Tooltip"))} :
          </Col>
          <Col span={20}>
            <Row style={{marginBottom: "10px"}}>
              <Col span={24}>
                <Select
                  style={{width: "100%"}}
                  placeholder={i18next.t("provider:Select model provider")}
                  value={selectedModelProvider || undefined}
                  onChange={(value) => onUpdateTool("modelProvider", value)}
                  showSearch
                  filterOption={(input, option) =>
                    option.children[1].toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {modelProviders.map((mp, index) => (
                    <Option key={index} value={mp.name}>
                      <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}}
                        src={Setting.getProviderLogoURL({category: mp.category, type: mp.type})}
                        alt={mp.name} />
                      {mp.displayName || mp.name}
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
            <Row style={{marginBottom: "10px"}}>
              <Col span={24}>
                <div style={{marginBottom: "4px"}}>
                  {Setting.getLabel(i18next.t("tool:Prompt examples"), i18next.t("tool:Prompt examples - Tooltip"))} :
                </div>
                <Select virtual={false} mode="tags" style={{width: "100%"}}
                  value={tool.promptExamples}
                  onChange={(value) => onUpdateTool("promptExamples", value)}
                />
              </Col>
            </Row>
            {selectedModelProvider ? (
              <ChatWidget
                key={`${tool.name}-${selectedModelProvider}`}
                chatName={`chat_tool_${tool.name}`}
                displayName={`${tool.name} - Chat Test`}
                category="ToolTest"
                modelProvider={selectedModelProvider}
                tool={tool.name}
                account={account}
                height="600px"
                showHeader={true}
                showNewChatButton={true}
                exampleQuestions={(tool.promptExamples || []).map(ex => ({title: ex, text: ex, image: ""}))}
              />
            ) : (
              <div style={{
                width: "100%",
                height: "100px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #d9d9d9",
                borderRadius: "6px",
                color: "#999",
              }}>
                {i18next.t("provider:Please select a model provider first")}
              </div>
            )}
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}

export default TestToolWidget;
