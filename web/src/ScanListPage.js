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
import {Button, Popconfirm, Table, Tag, Tooltip} from "antd";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as ScanBackend from "./backend/ScanBackend";
import * as AssetBackend from "./backend/AssetBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import {ScanResultPopover} from "./common/ScanResultPopover";

class ScanListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      assets: [],
      providers: [],
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this.getAssets();
    this.getProviders();
  }

  getAssets() {
    AssetBackend.getAssets(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            assets: res.data || [],
          });
        }
      });
  }

  getProviders() {
    ProviderBackend.getProviders(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            providers: res.data || [],
          });
        }
      });
  }

  getAssetInfo(assetName) {
    if (!assetName) {
      return null;
    }
    return this.state.assets.find(asset => asset.name === assetName);
  }

  getProviderInfo(providerName) {
    if (!providerName) {
      return null;
    }
    return this.state.providers.find(provider => provider.name === providerName);
  }

  getAssetTypeIcon(assetName) {
    const asset = this.getAssetInfo(assetName);
    if (!asset) {
      return null;
    }
    const typeIcons = Setting.getAssetTypeIcons();
    return typeIcons[asset.type] || null;
  }

  getAssetDisplayName(assetName) {
    const asset = this.getAssetInfo(assetName);
    if (!asset) {
      return assetName;
    }
    return asset.displayName || assetName;
  }

  getProviderLogo(providerName) {
    const provider = this.getProviderInfo(providerName);
    if (!provider) {
      return null;
    }

    const otherProviderInfo = Setting.getOtherProviderInfo();
    if (!otherProviderInfo[provider.category] || !otherProviderInfo[provider.category][provider.type]) {
      return null;
    }

    return otherProviderInfo[provider.category][provider.type].logo;
  }

  getProviderType(providerName) {
    const provider = this.getProviderInfo(providerName);
    if (!provider) {
      return "Nmap"; // Default to Nmap
    }
    return provider.type || "Nmap";
  }

  newScan() {
    return {
      owner: this.props.account.name,
      name: `scan_${Setting.getRandomName()}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Scan - ${Setting.getRandomName()}`,
      provider: "",
      targetMode: "Manual Input",
      target: "127.0.0.1",
      asset: "",
      state: "Created",
      runner: "",
      errorText: "",
      command: "",
      rawResult: "",
      result: "",
      resultSummary: "",
    };
  }

  addScan() {
    const newScan = this.newScan();
    ScanBackend.addScan(newScan)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/scans/${newScan.name}`, mode: "add"});
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  deleteItem = async(i) => {
    return ScanBackend.deleteScan(this.state.data[i]);
  };

  deleteScan(i) {
    ScanBackend.deleteScan(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          this.setState({
            data: Setting.deleteRow(this.state.data, i),
            pagination: {total: this.state.pagination.total - 1},
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(scans) {
    const columns = [
      {
        title: i18next.t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text, record, index) => {
          return (
            <Link to={`/scans/${record.name}`}>{text}</Link>
          );
        },
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/scans/${text}`}>{text}</Link>
          );
        },
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "160px",
        sorter: true,
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: i18next.t("scan:Target"),
        dataIndex: "target",
        key: "target",
        width: "160px",
        sorter: true,
        ...this.getColumnSearchProps("target"),
      },
      {
        title: i18next.t("general:Asset"),
        dataIndex: "asset",
        key: "asset",
        // width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("asset"),
        render: (text, record, index) => {
          const icon = this.getAssetTypeIcon(text);
          const displayName = this.getAssetDisplayName(text);
          return (
            <Link to={`/assets/${text}`}>
              <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                {icon && <img src={icon} alt={text} style={{width: "20px", height: "20px"}} />}
                <span>{displayName}</span>
              </div>
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Provider"),
        dataIndex: "provider",
        key: "provider",
        width: "220px",
        sorter: true,
        ...this.getColumnSearchProps("provider"),
        render: (text, record, index) => {
          const logo = this.getProviderLogo(text);
          return (
            <Link to={`/providers/${text}`}>
              <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                {logo && <img src={logo} alt={text} style={{width: "20px", height: "20px"}} />}
                <span>{text}</span>
              </div>
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("state"),
        render: (text, record, index) => {
          let color = "default";
          if (text === "Completed") {
            color = "success";
          } else if (text === "Running") {
            color = "processing";
          } else if (text === "Failed") {
            color = "error";
          } else if (text === "Pending") {
            color = "warning";
          } else if (text === "Created") {
            color = "default";
          }
          return <Tag color={color}>{text}</Tag>;
        },
      },
      {
        title: i18next.t("scan:Runner"),
        dataIndex: "runner",
        key: "runner",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("runner"),
      },
      {
        title: i18next.t("general:Error"),
        dataIndex: "errorText",
        key: "errorText",
        width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("errorText"),
        render: (text, record, index) => {
          if (!text) {
            return null;
          }
          // Show truncated error text with hover tooltip
          const maxLength = 50;
          const displayText = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
          return (
            <span style={{color: "red"}} title={text}>
              {displayText}
            </span>
          );
        },
      },
      {
        title: i18next.t("general:Result"),
        dataIndex: "result",
        key: "result",
        width: "200px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text, record, index) => {
          const providerType = this.getProviderType(record.provider);
          const logo = this.getProviderLogo(record.provider);
          const resultSummary = record.resultSummary;

          // Display result summary with provider icon, with popover for full result
          if (resultSummary) {
            return (
              <ScanResultPopover
                result={text}
                providerType={providerType}
                placement="left"
                maxDisplayLength={30}
                width="1000px"
                height="600px"
              >
                <div style={{display: "flex", alignItems: "center", gap: "8px", cursor: "pointer"}}>
                  {logo && <img src={logo} alt="provider" style={{width: "20px", height: "20px"}} />}
                  <span>{resultSummary}</span>
                </div>
              </ScanResultPopover>
            );
          }

          // Fallback to original popover if no result summary
          return (
            <ScanResultPopover
              result={text}
              providerType={providerType}
              placement="left"
              maxDisplayLength={30}
              width="1000px"
              height="600px"
            />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "130px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text, record, index) => {
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Tooltip title={i18next.t("general:Edit")}>
                <Button type="text" size="small" icon={<EditOutlined />} style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}} onClick={() => this.props.history.push(`/scans/${record.name}`)} />
              </Tooltip>
              <Popconfirm
                title={i18next.t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteItem(index).then(() => {
                  this.fetch({pagination: this.state.pagination});
                })}
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

    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={scans} rowKey={(record) => `${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Scans")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addScan.bind(this)}>{i18next.t("general:Add")}</Button>
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
    ScanBackend.getScans(this.props.account.name, params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
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
              loading: false,
              isAuthorized: false,
            });
          } else {
            Setting.showMessage("error", res.msg);
          }
        }
      });
  };
}

export default ScanListPage;
