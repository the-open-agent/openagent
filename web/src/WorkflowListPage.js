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
import {Link} from "react-router-dom";
import {Button, Popconfirm, Popover, Table, Tooltip} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as WorkflowBackend from "./backend/WorkflowBackend";
import i18next from "i18next";
import BpmnComponent from "./BpmnComponent";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import Editor from "./common/Editor";

class WorkflowListPage extends BaseListPage {
  constructor(props) {
    super(props);
  }

  getEditorLang(text) {
    if (!text) {
      return undefined;
    }
    try {
      JSON.parse(text);
      return "json";
    } catch (e) {
      return undefined;
    }
  }

  getEditorHeight(text) {
    const lineHeight = 22;
    const lines = (text || "").split("\n").length;
    const visibleRows = Math.min(30, Math.max(10, lines));
    return `${visibleRows * lineHeight}px`;
  }

  newWorkflow() {
    const randomName = Setting.getRandomName();
    return {
      owner: this.props.account.name,
      name: `workflow_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Workflow - ${randomName}`,
      questionTemplate: "You will play the role of a process comparison and analysis expert, helping users with non-technical backgrounds understand the differences between two processes. Work according to the following description:\n\nTask Description:\nPlease compare the following two flowcharts (without mentioning any node IDs or technical terms), and provide a concise and easy-to-understand overall difference description by analyzing the differences in each path of the process.\n\nRequirements:\n1. The answer must be in #{{language}} .\n2. Please avoid using any BPMN or professional process modeling-related terms, and keep the language simple and easy to understand.\n3. Focus only on the differences in process steps and paths to help non-technical personnel understand the differences between each process.\n4. The analysis should cover:\n   - Changes in the order of process steps,\n   - New or deleted sequence links,\n   - Changes in process complexity,\n   - Potential impacts or consequences of these differences.\n\nOutput Format:\nPlease organize your response clearly and logically, using numbered or bulleted lists where appropriate. Ensure the explanation flows well and is easy for non-technical readers to follow.\n\nInput Format:\nFlowchart 1:\n```xml\n#{{text}} \n```\n\nFlowchart 2:\n```xml\n#{{text2}} \n```\n\nAdditional Information:\n```text\n#{{message}} \n```\n\nPlease start the analysis based on the above content and provide a clear, structured, and easy-to-understand answer in #{{language}} .",
      text: "",
    };
  }

  renderQuestionTemplate(workflow) {
    const questionTemplate = workflow?.questionTemplate;

    if (!questionTemplate) {
      return "";
    }

    // Render the question template with variables replaced
    const renderedTemplate = questionTemplate.replace(/#\{\{(\w+)\}\}/g, (match, variableName) => {
      if (variableName === "language") {
        const lang = Setting.getLanguage();
        return (!lang || lang === "null") ? "en" : lang;
      }
      return workflow[variableName] || "";
    });

    return renderedTemplate;
  }

  addWorkflow() {
    const newWorkflow = this.newWorkflow();
    WorkflowBackend.addWorkflow(newWorkflow)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/workflows/${newWorkflow.name}`,
            state: {isNewWorkflow: true},
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  deleteItem = async(i) => {
    return WorkflowBackend.deleteWorkflow(this.state.data[i]);
  };

  deleteWorkflow(record) {
    WorkflowBackend.deleteWorkflow(record)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          this.setState({
            data: this.state.data.filter((item) => item.name !== record.name),
            pagination: {
              ...this.state.pagination,
              total: this.state.pagination.total - 1,
            },
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${error}`);
      });
  }

  renderTable(workflows) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "160px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/workflows/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "200px",
        sorter: (a, b) => a.displayName.localeCompare(b.displayName),
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: i18next.t("general:Text"),
        dataIndex: "text",
        key: "text",
        // width: "160px",
        sorter: (a, b) => a.text.localeCompare(b.text),
        render: (text, record, index) => {
          return (
            <Tooltip placement="left" styles={{body: {width: "515px", height: "615px"}}} title={
              <div style={{width: "500px", height: "600px", backgroundColor: "white"}}>
                <BpmnComponent
                  diagramXML={text}
                  onLoading={(info) => {
                    Setting.showMessage("success", info);
                  }}
                  onError={(err) => {
                    Setting.showMessage("error", err);
                  }}
                />
              </div>
            }>
              <div style={{maxWidth: "300px"}}>
                {Setting.getShortText(text, 100)}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: i18next.t("general:Text2"),
        dataIndex: "text2",
        key: "text2",
        // width: "160px",
        sorter: (a, b) => a.text2.localeCompare(b.text2),
        render: (text, record, index) => {
          return (
            <Tooltip placement="left" styles={{body: {width: "515px", height: "615px"}}} title={
              <div style={{width: "500px", height: "600px", backgroundColor: "white"}}>
                <BpmnComponent
                  diagramXML={text}
                  onLoading={(info) => {
                    Setting.showMessage("success", info);
                  }}
                  onError={(err) => {
                    Setting.showMessage("error", err);
                  }}
                />
              </div>
            }>
              <div style={{maxWidth: "300px"}}>
                {Setting.getShortText(text, 100)}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: i18next.t("general:Message"),
        dataIndex: "message",
        key: "message",
        // width: "160px",
        sorter: (a, b) => a.text.localeCompare(b.text),
        ...this.getColumnSearchProps("message"),
        render: (text, record, index) => {
          return (
            <Tooltip placement="left" styles={{body: {width: "815px", maxHeight: "355px"}}} title={
              <Editor value={text} lang={this.getEditorLang(text)} dark readOnly height={this.getEditorHeight(text)} fillWidth />
            }>
              <div style={{maxWidth: "300px"}}>
                {Setting.getShortText(text, 100)}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: i18next.t("task:Question"),
        dataIndex: "questionTemplate",
        key: "questionTemplate",
        // width: "160px",
        sorter: (a, b) => a.questionTemplate.localeCompare(b.questionTemplate),
        ...this.getColumnSearchProps("questionTemplate"),
        render: (text, record, index) => {
          return (
            <Popover
              placement="left"
              trigger="hover"
              title={i18next.t("task:Question")}
              content={
                <div style={{display: "flex"}}>
                  <Editor
                    value={text}
                    lang="text"
                    dark
                    readOnly
                    height="400px"
                    width="400px"
                  />
                  <div style={{width: "400px", height: "400px"}}>
                    <Editor
                      value={this.renderQuestionTemplate(record)}
                      lang="xml"
                      fillHeight
                      dark
                      readOnly
                    />
                  </div>
                </div>
              }>
              <div style={{maxWidth: "300px"}}>
                {Setting.getShortText(text, 100)}
              </div>
            </Popover>
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "130px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text, record, index) => {
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Tooltip title={i18next.t("general:Edit")}>
                <Button type="text" size="small" icon={<EditOutlined />} style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}} onClick={() => this.props.history.push(`/workflows/${record.name}`)} />
              </Tooltip>
              <Popconfirm
                placement="topLeft"
                title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteWorkflow(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Tooltip title={i18next.t("general:Delete")}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}} />
                </Tooltip>
              </Popconfirm>
            </div>
          );
        },
      },
    ];
    const filteredColumns = Setting.filterTableColumns(columns, this.props.formItems ?? this.state.formItems);
    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={filteredColumns} dataSource={workflows} rowKey="name" rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Workflows")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addWorkflow.bind(this)}>{i18next.t("general:Add")}</Button>
              {this.state.selectedRowKeys.length > 0 && (
                <Popconfirm title={`${i18next.t("general:Sure to delete")}: ${this.state.selectedRowKeys.length} ${i18next.t("general:items")} ?`} onConfirm={() => this.performBulkDelete(this.state.selectedRows, this.state.selectedRowKeys)} okText={i18next.t("general:OK")} cancelText={i18next.t("general:Cancel")}>
                  <Button type="primary" danger size="small" icon={<DeleteOutlined />} style={{marginLeft: 8}}>
                    {i18next.t("general:Delete")} ({this.state.selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              )}
            </div>
          )}
          loading={this.getTableLoading()}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params = {}) => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    WorkflowBackend.getWorkflows(this.props.account.name, params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data2,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          });
        } else {
          if (Setting.isResponseDenied(res)) {
            this.setState({
              isAuthorized: false,
            });
          } else {
            Setting.showMessage("error", res.msg);
          }
        }
      });
  };
}

export default WorkflowListPage;
