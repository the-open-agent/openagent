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
import {Button, Popconfirm, Switch, Table, Tag} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as ToolBackend from "./backend/ToolBackend";
import i18next from "i18next";
import {DeleteOutlined} from "@ant-design/icons";

class ToolListPage extends BaseListPage {
  constructor(props) {
    super(props);
  }

  newTool() {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `tool_${randomName}`,
      createdTime: moment().format(),
      displayName: "",
      displayName2: "",
      type: "time",
      subType: "Default",
      clientId: "",
      clientSecret: "",
      providerUrl: "",
      enableProxy: false,
      testContent: "",
      modelProvider: "",
      resultSummary: "",
      state: "Active",
    };
  }

  addTool() {
    const newTool = this.newTool();
    ToolBackend.addTool(newTool)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/tools/${newTool.name}`,
            state: {isNewTool: true},
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
    return ToolBackend.deleteTool(this.state.data[i]);
  };

  deleteTool(record) {
    ToolBackend.deleteTool(record)
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

  renderTable(tools) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text) => (
          <Link to={`/tools/${text}`}>{text}</Link>
        ),
      },
      {
        title: i18next.t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "180px",
        filterMultiple: false,
        filters: Setting.getProviderTypeOptions("Tool").map((o) => ({text: o.name, value: o.name})),
        onFilter: (value, record) => record.type === value,
        sorter: (a, b) => a.type.localeCompare(b.type),
        render: (text, record) => (
          <span>
            <img width={20} height={20} style={{marginBottom: "3px", marginRight: "6px"}}
              src={Setting.getProviderLogoURL({category: "Tool", type: text})} alt={text} />
            {text}
          </span>
        ),
      },
      {
        title: i18next.t("provider:Sub type"),
        dataIndex: "subType",
        key: "subType",
        width: "150px",
        sorter: (a, b) => (a.subType || "").localeCompare(b.subType || ""),
        ...this.getColumnSearchProps("subType"),
      },
      {
        title: i18next.t("tool:Functions"),
        key: "functions",
        render: (_, record) => (
          <div style={{display: "flex", flexDirection: "column", gap: "4px"}}>
            {Setting.getToolFunctions(record).map((f) => (
              <Tag key={f.name} style={{fontFamily: "monospace", margin: 0}}>{f.name}</Tag>
            ))}
          </div>
        ),
      },
      {
        title: i18next.t("provider:Enable proxy"),
        dataIndex: "enableProxy",
        key: "enableProxy",
        width: "130px",
        render: (text, record) => {
          if (!["web_search", "web_fetch", "web_browser", "browser_use"].includes(record.type)) {
            return null;
          }
          return <Switch disabled checked={text} />;
        },
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "110px",
        sorter: (a, b) => (a.state || "").localeCompare(b.state || ""),
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "220px",
        fixed: (Setting.isMobile()) ? "right" : false,
        render: (text, record) => (
          <div>
            <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary"
              onClick={() => this.props.history.push(`/tools/${record.name}`)}>
              {i18next.t("general:Edit")}
            </Button>
            <Popconfirm
              title={`${i18next.t("general:Sure to delete")}: ${record.name}?`}
              onConfirm={() => this.deleteTool(record)}
              okText={i18next.t("general:OK")}
              cancelText={i18next.t("general:Cancel")}
            >
              <Button style={{marginBottom: "10px"}} type="primary" danger icon={<DeleteOutlined />}>
                {i18next.t("general:Delete")}
              </Button>
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
          dataSource={tools}
          rowKey="name"
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Tools")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={() => this.addTool()}>
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
    ToolBackend.getTools("admin", pagination.current, pagination.pageSize, this.state.searchField, this.state.searchValue, params.sortField, params.sortOrder)
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

export default ToolListPage;
