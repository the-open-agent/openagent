// Copyright 2023 The OpenAgent Authors. All Rights Reserved.
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
import {Button, Col, Input, Progress, Row, Select, Space, Spin, Typography, Upload} from "antd";
import SectionCard from "./components/ui/section-card";
import {Card} from "./components/ui/card";

const ANALYZE_PROGRESS_DURATION_SEC = 300;
const ANALYZE_PROGRESS_TICK_MS = 500;
const ANALYZE_PROGRESS_MAX_PERCENT = 99;

import {BarChartOutlined, ClearOutlined, CloseOutlined, DownloadOutlined, FilePdfOutlined, FileWordOutlined, UploadOutlined} from "@ant-design/icons";
import * as TaskBackend from "./backend/TaskBackend";
import * as ScaleBackend from "./backend/ScaleBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as MessageBackend from "./backend/MessageBackend";
import Editor from "./common/Editor";
import TaskAnalysisReport from "./TaskAnalysisReport";
import * as Provider from "./Provider";

const {Option} = Select;
const {TextArea} = Input;

class TaskEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      owner: props.match.params.owner,
      taskName: props.match.params.taskName,
      isNewTask: props.location?.state?.isNewTask || false,
      modelProviders: [],
      publicScales: [],
      task: null,
      analyzing: false,
      analyzeProgress: 0,
      loading: false,
      uploadingDocument: false,
    };
    this.analyzeProgressIntervalId = null;
    this.analyzeStartTime = null;
  }

  componentWillUnmount() {
    if (this.analyzeProgressIntervalId !== null) {
      clearInterval(this.analyzeProgressIntervalId);
    }
  }

  UNSAFE_componentWillMount() {
    this.getTask();
    this.getModelProviders();
    ScaleBackend.getPublicScales().then((res) => {
      if (res.status === "ok" && res.data) {
        this.setState({publicScales: res.data});
      }
    });
  }

  normalizeTaskResult(task) {
    if (!task) {
      return task;
    }
    let t = task.scale === undefined || task.scale === null ? {...task, scale: ""} : task;
    if (!t.result) {
      return t;
    }
    if (typeof t.result === "string") {
      try {
        t = {...t, result: JSON.parse(t.result)};
      } catch {
        t = {...t, result: null};
      }
    }
    return t;
  }

  getTask() {
    TaskBackend.getTask(this.state.owner, this.state.taskName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            task: this.normalizeTaskResult(res.data),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getEffectiveScale() {
    const task = this.state.task;
    if (!task || !task.scale || !this.state.publicScales?.length) {
      return "";
    }
    const s = this.state.publicScales.find((x) => `${x.owner}/${x.name}` === task.scale);
    return s ? (s.text || "") : "";
  }

  getQuestion() {
    const scale = this.getEffectiveScale();
    return `${scale.replace("{example}", this.state.task.example).replace("{labels}", this.state.task.labels.map(label => `"${label}"`).join(", "))}`;
  }

  analyzeTask() {
    if (!String(this.state.task?.scale || "").trim()) {
      return;
    }
    this.analyzeStartTime = Date.now();
    this.setState({analyzing: true, analyzeProgress: 0});
    const durationMs = ANALYZE_PROGRESS_DURATION_SEC * 1000;
    this.analyzeProgressIntervalId = setInterval(() => {
      const elapsed = Date.now() - this.analyzeStartTime;
      const percent = Math.min(ANALYZE_PROGRESS_MAX_PERCENT, (99 * elapsed) / durationMs);
      this.setState({analyzeProgress: Math.round(percent)});
    }, ANALYZE_PROGRESS_TICK_MS);
    TaskBackend.analyzeTask(this.state.task.owner, this.state.task.name)
      .then((res) => {
        if (res.status === "ok") {
          const task = this.state.task;
          task.result = res.data;
          task.score = res.data.score;
          this.setState({task: task});
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      })
      .catch(err => {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${err.message}`);
      })
      .finally(() => {
        if (this.analyzeProgressIntervalId !== null) {
          clearInterval(this.analyzeProgressIntervalId);
          this.analyzeProgressIntervalId = null;
        }
        this.setState({analyzeProgress: 100}, () => {
          setTimeout(() => {
            this.setState({analyzing: false, analyzeProgress: 0});
          }, 400);
        });
      });
  }

  clearReport = () => {
    const task = this.state.task;
    task.result = null;
    task.score = 0;
    this.setState({task: task});
  };

  getAnswer() {
    const provider = this.state.task.provider;
    const question = this.getQuestion();
    const framework = this.state.task.name;
    const video = "";
    MessageBackend.getAnswer(provider, question, framework, video)
      .then((res) => {
        if (res.status === "ok") {
          this.updateTaskField("log", res.data);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }

        this.setState({
          loading: false,
        });
      });
  }

  getModelProviders() {
    ProviderBackend.getProviders(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            modelProviders: res.data.filter(provider => provider.category === "Model"),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  parseTaskField(key, value) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateTaskField(key, value) {
    value = this.parseTaskField(key, value);

    const task = this.state.task;
    task[key] = value;
    this.setState({
      task: task,
    });
  }

  fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  handleDocumentUpload = async({file}) => {
    this.setState({uploadingDocument: true});

    const base64Data = await this.fileToBase64(file);
    const taskId = `${this.state.task.owner}/${this.state.task.name}`;

    TaskBackend.uploadTaskDocument(taskId, base64Data, file.name, file.type)
      .then((res) => {
        if (res.status === "ok") {
          const result = res.data;
          const task = this.state.task;
          task.documentUrl = result.url;
          task.documentText = result.text;
          this.setState({task: task});

          Setting.showMessage("success", i18next.t("general:Successfully uploaded"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to upload")}: ${res.msg}`);
        }
      })
      .catch(err => {
        Setting.showMessage("error", `${i18next.t("general:Failed to upload")}: ${err.message}`);
      })
      .finally(() => {
        this.setState({uploadingDocument: false});
      });
  };

  clearDocument = () => {
    const task = this.state.task;
    task.documentUrl = "";
    task.documentText = "";
    this.setState({task: task});
  };

  getDocumentFileName() {
    const url = this.state.task?.documentUrl || "";
    try {
      const path = new URL(url).pathname || url;
      const encoded = path.split("/").filter(Boolean).pop() || url;
      try {
        return decodeURIComponent(encoded);
      } catch {
        return encoded;
      }
    } catch {
      return url;
    }
  }

  renderTaskField(label, control, span = 8) {
    return (
      <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : span}>
        {label && <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>}
        {control}
      </Col>
    );
  }

  renderTaskActions() {
    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };
    return (
      <Space wrap>
        <Button style={btnStyle} onClick={() => this.submitTaskEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button style={btnStyle} onClick={() => this.submitTaskEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
        {this.state.isNewTask && <Button style={btnStyle} onClick={() => this.cancelTaskEdit()}>{i18next.t("general:Cancel")}</Button>}
      </Space>
    );
  }

  renderTask() {
    const task = this.state.task;
    const rowGutter = [16, 8];
    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("task:Edit Task")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            {this.renderTaskActions()}
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderTaskField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={task.name} onChange={(e) => this.updateTaskField("name", e.target.value)} />,
              Setting.isAdminUser(this.props.account) ? 8 : 24
            )}
            {Setting.isAdminUser(this.props.account) && this.renderTaskField(
              Setting.getLabel(i18next.t("provider:Model provider"), i18next.t("provider:Model provider - Tooltip")),
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={task.provider}
                onChange={(value) => this.updateTaskField("provider", value)}
                options={this.state.modelProviders.map((p) => ({
                  value: p.name,
                  label: (
                    <span style={{display: "inline-flex", alignItems: "center", gap: 8}}>
                      <Provider.ProviderLogo provider={p} width={20} height={20} />
                      <span>{Setting.getProviderDisplayName(p)} ({p.name})</span>
                    </span>
                  ),
                }))}
              />,
              8
            )}
            {Setting.isAdminUser(this.props.account) && this.renderTaskField(
              Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={task.type} onChange={(value) => this.updateTaskField("type", value)}>
                {[
                  {id: "Labeling", name: "Labeling"},
                  {id: "PBL", name: "PBL"},
                ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)}
              </Select>,
              8
            )}
            {(task.type === "Labeling" || Setting.isAdminUser(this.props.account)) && this.renderTaskField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={task.displayName} onChange={(e) => this.updateTaskField("displayName", e.target.value)} />,
              8
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Options")}>
          <Row gutter={rowGutter}>
            {this.renderTaskField(
              Setting.getLabel(i18next.t("task:Scale"), i18next.t("task:Scale - Tooltip")),
              <Select
                virtual={false}
                style={{width: "100%"}}
                placeholder={i18next.t("general:None")}
                allowClear
                value={task.scale ?? ""}
                onChange={(value) => this.setState({task: {...task, scale: value || ""}})}
                options={[
                  {value: "", label: i18next.t("general:None")},
                  ...this.state.publicScales.map((s) => ({value: `${s.owner}/${s.name}`, label: s.displayName ? `${s.displayName} (${s.owner}/${s.name})` : `${s.owner}/${s.name}`})),
                ]}
              />,
              16
            )}
            {this.getEffectiveScale() ? this.renderTaskField(
              Setting.getLabel(i18next.t("general:Text"), i18next.t("task:Scale - Tooltip")),
              <TextArea rows={5} style={{maxHeight: "120px", overflow: "auto"}} readOnly value={this.getEffectiveScale()} />,
              24
            ) : null}
            {this.renderTaskField(
              Setting.getLabel(i18next.t("store:File"), i18next.t("store:File - Tooltip")),
              task.documentUrl ? (
                <Card style={{display: "inline-block", width: "auto", maxWidth: "100%", verticalAlign: "top"}}>
                  <div style={{display: "flex", alignItems: "center", gap: 12, flexWrap: "nowrap", minWidth: 0}}>
                    <span style={{fontSize: 28, flexShrink: 0, color: task.documentUrl.endsWith(".pdf") ? "#cf1322" : "#1890ff"}}>
                      {task.documentUrl.endsWith(".pdf") ? <FilePdfOutlined /> : <FileWordOutlined />}
                    </span>
                    <div style={{minWidth: 0, maxWidth: "min(960px, calc(100vw - 220px))", flex: "0 1 auto"}}>
                      <Typography.Text ellipsis={{tooltip: true}} style={{width: "100%"}}>
                        {this.getDocumentFileName()}
                      </Typography.Text>
                    </div>
                    <Button type="link" size="small" icon={<DownloadOutlined />} href={task.documentUrl} target="_blank" rel="noopener noreferrer" style={{flexShrink: 0}}>
                      {i18next.t("general:Download")}
                    </Button>
                    <Button type="text" size="small" danger icon={<CloseOutlined />} onClick={this.clearDocument} aria-label={i18next.t("general:Delete")} style={{flexShrink: 0}} />
                  </div>
                </Card>
              ) : (
                <Upload name="file" accept=".docx,.pdf" showUploadList={false} customRequest={this.handleDocumentUpload}>
                  <Button type="primary" icon={<UploadOutlined />} loading={this.state.uploadingDocument}>
                    {i18next.t("store:Upload file")} (.docx, .pdf)
                  </Button>
                </Upload>
              ),
              24
            )}
            {task.type === "Labeling" && (
              <>
                {this.renderTaskField(
                  Setting.getLabel(i18next.t("task:Example"), i18next.t("task:Example - Tooltip")),
                  <Input value={task.example} onChange={(e) => this.updateTaskField("example", e.target.value)} />,
                  12
                )}
                {this.renderTaskField(
                  Setting.getLabel(i18next.t("task:Labels"), i18next.t("task:Labels - Tooltip")),
                  <Select virtual={false} mode="tags" style={{width: "100%"}} value={task.labels} onChange={(value) => this.updateTaskField("labels", value)}>
                    {task.labels?.map((item, index) => <Option key={index} value={item}>{item}</Option>)}
                  </Select>,
                  12
                )}
              </>
            )}
            {task.type !== "Labeling" && task.documentUrl ? this.renderTaskField(
              Setting.getLabel(i18next.t("task:Report"), i18next.t("task:Report - Tooltip")),
              <div>
                <Button
                  loading={this.state.analyzing}
                  disabled={!task.documentText || !!task.result || !String(task.scale || "").trim()}
                  style={{marginBottom: "20px", width: "200px"}}
                  type="primary"
                  icon={<BarChartOutlined />}
                  onClick={() => this.analyzeTask()}
                >
                  {i18next.t("task:Analyze")}
                </Button>
                {task.result ? (
                  <Button style={{marginBottom: "20px", marginLeft: "8px", width: "200px"}} icon={<ClearOutlined />} onClick={this.clearReport}>
                    {i18next.t("general:Clear")}
                  </Button>
                ) : null}
                {this.state.analyzing && (
                  <>
                    <div style={{maxWidth: "400px", marginTop: "8px", marginBottom: "8px"}}>
                      <Progress percent={this.state.analyzeProgress} status="active" />
                    </div>
                    <Spin style={{marginLeft: "16px"}} tip={i18next.t("task:Analyzing")} />
                  </>
                )}
                {task.result && (
                  <TaskAnalysisReport
                    result={task.result}
                    downloadFileName={`${task.owner}_${task.name}_report.docx`}
                  />
                )}
              </div>,
              24
            ) : task.type === "Labeling" ? this.renderTaskField(
              Setting.getLabel(i18next.t("task:Log"), i18next.t("task:Log - Tooltip")),
              <div>
                <Button loading={this.state.loading} style={{marginBottom: "20px", width: "100px"}} type="primary" onClick={this.runTask.bind(this)}>{i18next.t("general:Run")}</Button>
                <div style={{height: "200px"}}>
                  <Editor
                    value={task.log}
                    lang="js"
                    fillHeight
                    dark
                    onChange={(value) => this.updateTaskField("log", value)}
                  />
                </div>
              </div>,
              24
            ) : null}
          </Row>
        </SectionCard>
      </div>
    );
  }

  runTask() {
    this.updateTaskField("log", "");
    this.setState({
      loading: true,
    });
    this.getAnswer();
  }

  submitTaskEdit(exitAfterSave) {
    const task = Setting.deepCopy(this.state.task);
    if (task.result && typeof task.result === "object") {
      task.result = JSON.stringify(task.result);
    }
    TaskBackend.updateTask(this.state.task.owner, this.state.taskName, task)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              taskName: this.state.task.name,
              isNewTask: false,
            });
            if (exitAfterSave) {
              this.props.history.push("/tasks");
            } else {
              this.props.history.push(`/tasks/${this.state.task.owner}/${this.state.task.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to save"));
            this.updateTaskField("name", this.state.taskName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelTaskEdit() {
    if (this.state.isNewTask) {
      TaskBackend.deleteTask(this.state.task)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/tasks");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/tasks");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.task !== null ? this.renderTask() : <Loading type="page" tip={i18next.t("general:Loading")} />}
      </div>
    );
  }
}

export default TaskEditPage;
