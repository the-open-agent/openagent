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
import {Button, Popconfirm, Switch, Table} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as McpBackend from "./backend/McpBackend";
import i18next from "i18next";

import {DeleteOutlined} from "@ant-design/icons";
import Highlighter from "react-highlight-words";

class McpListPage extends BaseListPage {
  constructor(props) {
    super(props);
  }

  newMcpProvider() {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `mcp_${randomName}`,
      createdTime: moment().format(),
      displayName: `New MCP - ${randomName}`,
      displayName2: "",
      text: "",
      mcpTools: [],
      testContent: "",
      resultSummary: "",
      state: "Active",
      isRemote: false,
    };
  }

  addProvider() {
    const newProvider = this.newMcpProvider();
    McpBackend.addMcp(newProvider)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/mcp/${newProvider.name}`,
            state: {isNewProvider: true},
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
    return McpBackend.deleteMcp(this.state.data[i]);
  };

  deleteProvider(record) {
    McpBackend.deleteMcp(record)
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

  renderTable(providers) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text) => {
          return (
            <Link to={`/mcp/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "220px",
        sorter: (a, b) => Setting.getProviderDisplayName(a).localeCompare(Setting.getProviderDisplayName(b)),
        ...this.getColumnSearchProps("displayName"),
        onFilter: (value, record) => {
          const v = (value || "").toLowerCase();
          const hay = `${record.displayName || ""} ${record.displayName2 || ""}`.toLowerCase();
          return hay.includes(v);
        },
        render: (text, record) => {
          const visible = Setting.getProviderDisplayName(record);
          return this.state.searchedColumn === "displayName" ? (
            <Highlighter
              highlightStyle={{backgroundColor: "#ffc069", padding: 0}}
              searchWords={[this.state.searchText]}
              autoEscape
              textToHighlight={visible ? visible.toString() : ""}
            />
          ) : (
            visible
          );
        },
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "90px",
        sorter: (a, b) => a.state.localeCompare(b.state),
      },
      {
        title: i18next.t("provider:Is remote"),
        dataIndex: "isRemote",
        key: "isRemote",
        width: "120px",
        sorter: (a, b) => a.isRemote - b.isRemote,
        render: (text) => {
          return (
            <Switch disabled checkedChildren={i18next.t("general:ON")} unCheckedChildren={i18next.t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "180px",
        fixed: "right",
        render: (text, record) => {
          return (
            <div>
              <Button
                style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}}
                type={record.isRemote ? "default" : "primary"}
                onClick={() => this.props.history.push(`/mcp/${record.name}`)}
              >
                {record.isRemote ? i18next.t("general:View") : i18next.t("general:Edit")}
              </Button>
              <Popconfirm
                title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteProvider(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
                disabled={record.isRemote}
              >
                <Button
                  style={{marginBottom: "10px"}}
                  type="primary"
                  danger
                  disabled={record.isRemote}
                >
                  {i18next.t("general:Delete")}
                </Button>
              </Popconfirm>
            </div>
          );
        },
      },
    ];

    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={providers} rowKey="name" rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:MCP")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={() => this.addProvider()}>{i18next.t("general:Add")}</Button>
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
    this.setState({loading: true});
    McpBackend.getMcps()
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data.length,
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

export default McpListPage;
