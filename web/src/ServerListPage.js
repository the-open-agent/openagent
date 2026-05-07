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
import {Button, Popconfirm, Table, Tooltip} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as ServerBackend from "./backend/ServerBackend";
import i18next from "i18next";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import ScanServerModal from "./common/modal/ScanServerModal";

class ServerListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      showScanModal: false,
      scanLoading: false,
      scanResult: null,
      scanServers: [],
      scanCidr: "",
    };
  }

  newServer() {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `server_${randomName}`,
      createdTime: moment().format(),
      displayName: `New MCP Server - ${randomName}`,
      testContent: "",
      isDefault: false,
    };
  }

  addServer() {
    const newServer = this.newServer();
    ServerBackend.addServer(newServer)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/servers/${newServer.name}`,
            state: {isNewServer: true},
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  openScanModal = () => {
    this.setState({showScanModal: true, scanResult: null, scanServers: [], scanCidr: ""});
  };

  closeScanModal = () => {
    if (this.state.scanLoading) {return;}
    this.setState({showScanModal: false});
  };

  submitScan = () => {
    const cidr = this.state.scanCidr.trim();
    if (!cidr) {
      Setting.showMessage("error", i18next.t("server:Please enter a CIDR"));
      return;
    }
    this.setState({scanLoading: true});
    ServerBackend.syncIntranetServers([cidr])
      .then((res) => {
        this.setState({scanLoading: false});
        if (res.status === "ok") {
          const scanResult = res.data ?? {};
          const scanServers = scanResult.servers ?? [];
          this.setState({scanResult, scanServers});
          Setting.showMessage("success", `${i18next.t("general:Successfully got")}: ${scanServers.length} server(s)`);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({scanLoading: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  };

  addScannedServer = (scanServer) => {
    const randomName = Setting.getRandomName();
    const newServer = {
      owner: "admin",
      name: `server_${randomName}`,
      createdTime: moment().format(),
      displayName: `Scanned MCP ${scanServer.host}:${scanServer.port}`,
      url: scanServer.url,
      testContent: "",
      isDefault: false,
    };
    ServerBackend.addServer(newServer)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          const {pagination} = this.state;
          this.fetch({pagination});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  };

  deleteItem = async(i) => {
    return ServerBackend.deleteServer(this.state.data[i]);
  };

  deleteServer(record) {
    ServerBackend.deleteServer(record)
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

  renderTable(servers) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "200px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text) => (
          <Link to={`/servers/${text}`}>{text}</Link>
        ),
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        sorter: (a, b) => (a.displayName || "").localeCompare(b.displayName || ""),
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: i18next.t("general:Tool"),
        key: "tools",
        width: "130px",
        render: (_, record) => (record.tools ? record.tools.length : 0),
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
              <Button type="text" size="small" icon={<EditOutlined />} style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}} onClick={() => this.props.history.push(`/servers/${record.name}`)} />
            </Tooltip>
            <Popconfirm
              title={`${i18next.t("general:Sure to delete")}: ${record.name}?`}
              onConfirm={() => this.deleteServer(record)}
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
      <>
        <Table
          scroll={{x: "max-content"}}
          columns={columns}
          dataSource={servers}
          rowKey="name"
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:MCP Servers")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={() => this.addServer()}>
                {i18next.t("general:Add")}
              </Button>
              &nbsp;
              <Button size="small" onClick={this.openScanModal}>
                {i18next.t("server:Scan server")}
              </Button>
              &nbsp;
              <Button size="small" onClick={() => this.props.history.push("/server-store")}>
                {i18next.t("general:MCP Store")}
              </Button>
            </div>
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
        <ScanServerModal
          open={this.state.showScanModal}
          loading={this.state.scanLoading}
          cidr={this.state.scanCidr}
          scanResult={this.state.scanResult}
          scanServers={this.state.scanServers}
          onSubmit={this.submitScan}
          onCancel={this.closeScanModal}
          onChangeCidr={(cidr) => this.setState({scanCidr: cidr, scanResult: null, scanServers: []})}
          onAddScannedServer={this.addScannedServer}
        />
      </>
    );
  }

  fetch = (params = {}) => {
    const {pagination} = params;
    this.setState({loading: true});
    ServerBackend.getServers("admin", pagination.current, pagination.pageSize, this.state.searchField, this.state.searchValue, params.sortField, params.sortOrder)
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

export default ServerListPage;
