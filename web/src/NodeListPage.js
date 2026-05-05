// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
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
import {Button, Dropdown, Popconfirm, Switch, Table} from "antd";
import BaseListPage from "./BaseListPage";
import moment from "moment";
import * as Setting from "./Setting";
import * as NodeBackend from "./backend/NodeBackend";
import i18next from "i18next";
import {DeleteOutlined, EditOutlined, LinkOutlined, MoreOutlined} from "@ant-design/icons";

class NodeListPage extends BaseListPage {
  constructor(props) {
    super(props);
  }

  newNode() {
    return {
      owner: this.props.account.owner,
      name: `node_${Setting.getRandomName()}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Machine - ${Setting.getRandomName()}`,
      protocol: "RDP",
      privateIp: "127.0.0.1",
      remoteProtocol: "RDP",
      remotePort: 3389,
      remoteUsername: "Administrator",
      remotePassword: "123",
      language: "en",
      autoQuery: false,
      isPermanent: true,
      enableRemoteApp: false,
      remoteApps: [],
      services: [],
    };
  }

  addNode() {
    const newNode = this.newNode();
    NodeBackend.addNode(newNode)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/nodes/${newNode.name}`, mode: "add"});
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  deleteItem = async(i) => {
    return NodeBackend.deleteNode(this.state.data[i]);
  };

  deleteNode(i) {
    NodeBackend.deleteNode(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          this.setState({
            data: Setting.deleteRow(this.state.data, i),
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

  renderTable(nodes) {
    const columns = [
      {
        title: i18next.t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text, node, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.props.account).replace("/account", `/organizations/${text}`)}>
              {text}
            </a>
          );
        },
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/nodes/${record.name}`}>{text}</Link>
          );
        },
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "160px",
        // sorter: true,
        sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        render: (text, node, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("general:Description"),
        dataIndex: "description",
        key: "description",
        // width: '200px',
        sorter: (a, b) => a.description.localeCompare(b.description),
      },
      {
        title: i18next.t("machine:Protocol"),
        dataIndex: "remoteProtocol",
        key: "protocol",
        width: "50px",
        sorter: true,
        filterMultiple: false,
        filters: [
          {text: "RDP", value: "RDP"},
          {text: "VNC", value: "VNC"},
          {text: "SSH", value: "SSH"},
          {text: "", value: "-"},
        ],
      },
      {
        title: i18next.t("machine:Private IP"),
        dataIndex: "privateIp",
        key: "ip",
        width: "120px",
        sorter: (a, b) => a.ip.localeCompare(b.ip),
      },
      {
        title: i18next.t("general:Port"),
        dataIndex: "remotePort",
        key: "port",
        width: "90px",
        sorter: (a, b) => a.port - b.port,
      },
      {
        title: i18next.t("general:Username"),
        dataIndex: "remoteUsername",
        key: "username",
        width: "130px",
        sorter: (a, b) => a.username.localeCompare(b.username),
      },
      {
        title: i18next.t("general:Language"),
        dataIndex: "language",
        key: "language",
        width: "90px",
        sorter: (a, b) => a.language.localeCompare(b.language),
      },
      {
        title: i18next.t("node:Auto query"),
        dataIndex: "autoQuery",
        key: "autoQuery",
        width: "100px",
        render: (text, record, index) => {
          return (
            <Switch disabled checked={text} />
          );
        },
      },
      {
        title: i18next.t("node:Is permanent"),
        dataIndex: "isPermanent",
        key: "isPermanent",
        width: "110px",
        render: (text, record, index) => {
          return (
            <Switch disabled checked={text} />
          );
        },
      },
      {
        title: i18next.t("node:Enable Remote App"),
        dataIndex: "enableRemoteApp",
        key: "enableRemoteApp",
        width: "150px",
        render: (text, record, index) => {
          return (
            <Switch disabled checked={text} />
          );
        },
      },
      {
        title: i18next.t("node:Remote Apps"),
        dataIndex: "remoteApps",
        key: "remoteApps",
        width: "120px",
        // todo: fix filter
        render: (text, record, index) => {
          return `${record.enableRemoteApp ? 1 : 0}  / ${record.remoteApps === null ? 0 : record.remoteApps.length}`;
        },
      },
      // {
      //   title: i18next.t("node:Services"),
      //   dataIndex: "services",
      //   key: "services",
      //   width: "90px",
      //   // todo: fix filter
      //   render: (text, record, index) => {
      //     return `${record.services.filter(service => service.status === "Running").length} / ${record.services.length}`;
      //   },
      // },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "150px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text, node, index) => {
          const connectUrl = `access/${node.owner}/${node.name}`;
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Button
                style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                type="default"
                icon={<EditOutlined />}
                onClick={() => this.props.history.push(`/nodes/${node.name}`)}
                title={i18next.t("general:Edit")}
              />
              <Popconfirm
                title={i18next.t("general:Sure to delete") + `: ${node.name} ?`}
                onConfirm={() => this.deleteNode(index)}
                disabled={node.owner !== this.props.account.owner}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Button
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  type="primary"
                  danger
                  disabled={node.owner !== this.props.account.owner}
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "connect",
                      icon: <LinkOutlined />,
                      label: i18next.t("node:Connect"),
                      disabled: node.owner !== this.props.account.owner,
                    },
                  ],
                  onClick: ({key}) => {
                    if (key === "connect") {
                      Setting.openLink(connectUrl);
                    }
                  },
                }}
                trigger={["click"]}
              >
                <Button
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  icon={<MoreOutlined />}
                />
              </Dropdown>
            </div>
          );
        },
      },
    ];
    const paginationProps = {
      pageSize: this.state.pagination.pageSize,
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={nodes} rowKey={(node) => `${node.owner}/${node.name}`} rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Nodes")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addNode.bind(this)}>{i18next.t("general:Add")}</Button>
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
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    NodeBackend.getNodes(params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
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

export default NodeListPage;
