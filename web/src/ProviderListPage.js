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
import {Link} from "react-router-dom";
import {Button, Popconfirm, Switch, Table, Tooltip} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as ProviderBackend from "./backend/ProviderBackend";
import i18next from "i18next";
import * as Provider from "./Provider";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import Highlighter from "react-highlight-words";

class ProviderListPage extends BaseListPage {
  constructor(props) {
    super(props);
  }

  newProvider() {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `provider_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Provider - ${randomName}`,
      displayName2: "",
      category: "Model",
      type: "OpenAI",
      subType: "text-davinci-003",
      clientId: "",
      clientSecret: "",
      mcpTools: [],
      enableThinking: false,
      temperature: 1,
      topP: 1,
      topK: 4,
      frequencyPenalty: 0,
      presencePenalty: 0,
      inputPricePerThousandTokens: 0.0,
      outputPricePerThousandTokens: 0.0,
      currency: "USD",
      providerUrl: "",
      apiVersion: "",
      apiKey: "",
      network: "",
      userKey: "",
      userCert: "",
      signKey: "",
      signCert: "",
      compatibleProvider: "",
      contractName: "",
      contractMethod: "",
      state: "Active",
      isRemote: false,
    };
  }

  newStorageProvider() {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `provider_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Provider - ${randomName}`,
      displayName2: "",
      category: "Storage",
      type: "Local File System",
      subType: "",
      clientId: "C:/storage_openagent",
      providerUrl: "",
      state: "Active",
      isRemote: false,
    };
  }

  addProvider() {
    const newProvider = this.newProvider();
    ProviderBackend.addProvider(newProvider)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/providers/${newProvider.name}`,
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
    return ProviderBackend.deleteProvider(this.state.data[i]);
  };

  deleteProvider(record) {
    ProviderBackend.deleteProvider(record)
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
        render: (text, record, index) => {
          return (
            <Link to={`/providers/${text}`}>
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
        title: i18next.t("general:Category"),
        dataIndex: "category",
        key: "category",
        width: "110px",
        filterMultiple: false,
        filters: [
          {text: "Model", value: "Model"},
          {text: "Embedding", value: "Embedding"},
          {text: "Storage", value: "Storage"},
          {text: "Agent", value: "Agent"},
          {text: "Public Cloud", value: "Public Cloud"},
          {text: "Private Cloud", value: "Private Cloud"},
          {text: "Blockchain", value: "Blockchain"},
          {text: "Video", value: "Video"},
          {text: "Text-to-Speech", value: "Text-to-Speech"},
          {text: "Speech-to-Text", value: "Speech-to-Text"},
          {text: "Bot", value: "Bot"},
          {text: "Chat", value: "Chat"},
          {text: "Scan", value: "Scan"},
        ],
        sorter: (a, b) => a.category.localeCompare(b.category),
      },
      {
        title: i18next.t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "150px",
        align: "center",
        filterMultiple: false,
        filters: [
          {text: "Model", value: "Model", children: Setting.getProviderTypeOptions("Model").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Embedding", value: "Embedding", children: Setting.getProviderTypeOptions("Embedding").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Storage", value: "Storage", children: Setting.getProviderTypeOptions("Storage").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Agent", value: "Agent", children: Setting.getProviderTypeOptions("Agent").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Public Cloud", value: "Public Cloud", children: Setting.getProviderTypeOptions("Public Cloud").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Private Cloud", value: "Private Cloud", children: Setting.getProviderTypeOptions("Private Cloud").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Blockchain", value: "Blockchain", children: Setting.getProviderTypeOptions("Blockchain").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Video", value: "Video", children: Setting.getProviderTypeOptions("Video").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Text-to-Speech", value: "Text-to-Speech", children: Setting.getProviderTypeOptions("Text-to-Speech").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Speech-to-Text", value: "Speech-to-Text", children: Setting.getProviderTypeOptions("Speech-to-Text").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Bot", value: "Bot", children: Setting.getProviderTypeOptions("Bot").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Chat", value: "Chat", children: Setting.getProviderTypeOptions("Chat").map((o) => {return {text: o.id, value: o.name};})},
          {text: "Scan", value: "Scan", children: Setting.getProviderTypeOptions("Scan").map((o) => {return {text: o.id, value: o.name};})},
        ],
        sorter: (a, b) => a.type.localeCompare(b.type),
        render: (text, record, index) => {
          return Provider.getProviderLogoWidget(record);
        },
      },
      {
        title: i18next.t("provider:Sub type"),
        dataIndex: "subType",
        key: "subType",
        width: "180px",
        sorter: (a, b) => a.subType.localeCompare(b.subType),
        ...this.getColumnSearchProps("subType"),
      },
      {
        title: i18next.t("provider:Client ID"),
        dataIndex: "clientId",
        key: "clientId",
        width: "240px",
        sorter: (a, b) => a.clientId.localeCompare(b.clientId),
        ...this.getColumnSearchProps("clientId"),
      },
      {
        title: i18next.t("general:Secret key"),
        dataIndex: "clientSecret",
        key: "clientSecret",
        width: "120px",
        sorter: (a, b) => a.clientSecret.localeCompare(b.clientSecret),
      },
      {
        title: i18next.t("general:Region"),
        dataIndex: "region",
        key: "region",
        width: "120px",
        sorter: (a, b) => a.region.localeCompare(b.region),
        ...this.getColumnSearchProps("region"),
      },
      {
        title: i18next.t("provider:API key"),
        dataIndex: "apiKey",
        key: "apiKey",
        width: "240px",
        sorter: (a, b) => a.apiKey.localeCompare(b.apiKey),
      },
      {
        title: i18next.t("store:Is default"),
        dataIndex: "isDefault",
        key: "isDefault",
        width: "120px",
        sorter: (a, b) => a.isDefault - b.isDefault,
        // ...this.getColumnSearchProps("isDefault"),
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={i18next.t("general:ON")} unCheckedChildren={i18next.t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: i18next.t("provider:Is remote"),
        dataIndex: "isRemote",
        key: "isRemote",
        width: "120px",
        sorter: (a, b) => a.isRemote - b.isRemote,
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={i18next.t("general:ON")} unCheckedChildren={i18next.t("general:OFF")} checked={text} />
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
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "150px",
        fixed: "right",
        render: (text, record, index) => {
          const editLabel = record.isRemote ? i18next.t("general:View") : i18next.t("general:Edit");
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Tooltip title={editLabel}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => this.props.history.push(`/providers/${record.name}`)}
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                />
              </Tooltip>
              <Popconfirm
                title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteProvider(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
                disabled={record.isRemote}
              >
                <Tooltip title={i18next.t("general:Delete")}>
                  <Button
                    type="text"
                    size="small"
                    danger
                    disabled={record.isRemote}
                    icon={<DeleteOutlined />}
                    style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  />
                </Tooltip>
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
              {i18next.t("general:Providers")}&nbsp;&nbsp;&nbsp;&nbsp;
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
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.category !== undefined && params.category !== null) {
      field = "category";
      value = params.category;
    } else if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    ProviderBackend.getProviders(this.props.account.name, Setting.getRequestStore(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
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

export default ProviderListPage;
