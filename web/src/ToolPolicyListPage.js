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
import {Link} from "react-router-dom";
import {Button, Popconfirm, Table, Tag, Tooltip} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as ToolPolicyBackend from "./backend/ToolPolicyBackend";
import i18next from "i18next";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";

const effectColor = {
  allow: "green",
  ask: "gold",
  deny: "red",
};

class ToolPolicyListPage extends BaseListPage {
  constructor(props) {
    super(props);
  }

  newToolPolicy() {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `policy_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Policy - ${randomName}`,
      store: "*",
      subject: "*",
      tool: "*",
      category: "*",
      resource: "*",
      effect: "deny",
      priority: 100,
      state: "Active",
    };
  }

  addToolPolicy() {
    const newToolPolicy = this.newToolPolicy();
    ToolPolicyBackend.addToolPolicy(newToolPolicy)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/tool-policies/${newToolPolicy.name}`,
            state: {isNewToolPolicy: true},
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
    return ToolPolicyBackend.deleteToolPolicy(this.state.data[i]);
  };

  deleteToolPolicy(record) {
    ToolPolicyBackend.deleteToolPolicy(record)
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

  renderPattern(text) {
    return <Tag style={{fontFamily: "monospace", margin: 0}}>{text || "*"}</Tag>;
  }

  renderTable(policies) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "160px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text) => (
          <Link to={`/tool-policies/${text}`}>{text}</Link>
        ),
      },
      {
        title: i18next.t("general:Store"),
        dataIndex: "store",
        key: "store",
        width: "130px",
        ...this.getColumnSearchProps("store"),
        render: (text) => this.renderPattern(text),
      },
      {
        title: i18next.t("general:Tool"),
        dataIndex: "tool",
        key: "tool",
        width: "130px",
        ...this.getColumnSearchProps("tool"),
        render: (text) => this.renderPattern(text),
      },
      {
        title: i18next.t("general:Category"),
        dataIndex: "category",
        key: "category",
        width: "110px",
        render: (text) => this.renderPattern(text),
      },
      {
        title: i18next.t("toolPolicy:Resource"),
        dataIndex: "resource",
        key: "resource",
        render: (text) => this.renderPattern(text),
      },
      {
        title: i18next.t("toolPolicy:Effect"),
        dataIndex: "effect",
        key: "effect",
        width: "100px",
        sorter: (a, b) => (a.effect || "").localeCompare(b.effect || ""),
        render: (text) => <Tag color={effectColor[text] || "default"}>{text}</Tag>,
      },
      {
        title: i18next.t("toolPolicy:Priority"),
        dataIndex: "priority",
        key: "priority",
        width: "100px",
        sorter: (a, b) => (a.priority || 0) - (b.priority || 0),
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "100px",
        sorter: (a, b) => (a.state || "").localeCompare(b.state || ""),
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "130px",
        fixed: "right",
        render: (text, record) => (
          <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
            <Tooltip title={i18next.t("general:Edit")}>
              <Button type="text" size="small" icon={<EditOutlined />} style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}} onClick={() => this.props.history.push(`/tool-policies/${record.name}`)} />
            </Tooltip>
            <Popconfirm
              title={`${i18next.t("general:Sure to delete")}: ${record.name}?`}
              onConfirm={() => this.deleteToolPolicy(record)}
              okText={i18next.t("general:OK")}
              cancelText={i18next.t("general:Cancel")}
            >
              <Tooltip title={i18next.t("general:Delete")}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}} />
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      },
    ];

    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100"],
      showTotal: (total) => i18next.t("general:{total} in total").replace("{total}", total),
    };

    return (
      <div>
        <Table
          scroll={{x: "max-content"}}
          columns={columns}
          dataSource={policies}
          rowKey="name"
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("toolPolicy:Tool Permissions")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={() => this.addToolPolicy()}>
                {i18next.t("general:Add")}
              </Button>
            </div>
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params = {}) => {
    const {pagination} = params;
    this.setState({loading: true});
    ToolPolicyBackend.getToolPolicies("admin", pagination.current, pagination.pageSize, this.state.searchField, this.state.searchValue, params.sortField, params.sortOrder)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            loading: false,
            data: res.data,
            pagination: {
              ...pagination,
              total: res.data2,
            },
          });
        } else {
          if (res.status === "error" && res.msg === "Unauthorized") {
            this.setState({isAuthorized: false, loading: false});
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          }
        }
      });
  };
}

export default ToolPolicyListPage;
