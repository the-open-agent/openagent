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
import {Button, Popconfirm, Select, Table, Tooltip} from "antd";
import {DeleteOutlined, EditOutlined, ReloadOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "./Setting";
import * as AssetBackend from "./backend/AssetBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as ScanBackend from "./backend/ScanBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import {JsonCodeMirrorPopover} from "./common/JsonCodeMirrorWidget";
import {ScanDetailPopover} from "./common/ScanDetailPopover";

const {Option} = Select;

class AssetListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      providers: [],
      allProviders: [],
      selectedProvider: "",
      scanning: false,
      allScans: [],
      loadingScans: false,
    };
  }

  componentDidMount() {
    this.getProviders();
    this.loadAllScans();
    this.loadAllProviders();
  }

  getProviders() {
    ProviderBackend.getProviders(this.props.account.owner)
      .then((res) => {
        if (res.status === "ok") {
          const cloudProviders = res.data.filter(provider =>
            provider.category === "Public Cloud"
          );
          this.setState({
            providers: cloudProviders,
            selectedProvider: cloudProviders.length > 0 ? cloudProviders[0].name : "",
          });
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  newAsset() {
    return {
      owner: this.props.account.owner,
      name: `asset_${Setting.getRandomName()}`,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      displayName: `New Asset - ${Setting.getRandomName()}`,
      provider: "",
      id: "",
      type: "Virtual Machine",
      region: "",
      zone: "",
      state: "Active",
      tag: "",
      username: "",
      password: "",
      properties: "{}",
    };
  }

  addAsset() {
    const newAsset = this.newAsset();
    AssetBackend.addAsset(newAsset)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/assets/${newAsset.name}`, mode: "add"});
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
    return AssetBackend.deleteAsset(this.state.data[i]);
  };

  deleteAsset(i) {
    AssetBackend.deleteAsset(this.state.data[i])
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

  scanAssets() {
    if (!this.state.selectedProvider) {
      Setting.showMessage("error", i18next.t("general:Please select a provider"));
      return;
    }

    this.setState({scanning: true});
    AssetBackend.scanAssets("admin", this.state.selectedProvider)
      .then((res) => {
        this.setState({scanning: false});
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("asset:Successfully scanned assets"));
          this.fetch({pagination: this.state.pagination});
        } else {
          Setting.showMessage("error", `${i18next.t("asset:Failed to scan assets")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({scanning: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  getProviderLogo(providerName) {
    const provider = this.state.providers.find(p => p.name === providerName);
    if (!provider) {
      return null;
    }

    const otherProviderInfo = Setting.getOtherProviderInfo();
    if (!otherProviderInfo[provider.category] || !otherProviderInfo[provider.category][provider.type]) {
      return null;
    }

    return otherProviderInfo[provider.category][provider.type].logo;
  }

  getTypeIcon(typeName) {
    const typeIcons = Setting.getAssetTypeIcons();
    return typeIcons[typeName] || null;
  }

  loadAllScans() {
    this.setState({loadingScans: true});
    ScanBackend.getScans("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            allScans: res.data || [],
            loadingScans: false,
          });
        } else {
          this.setState({
            allScans: [],
            loadingScans: false,
          });
        }
      })
      .catch(() => {
        this.setState({
          allScans: [],
          loadingScans: false,
        });
      });
  }

  getScansForAsset(assetName) {
    return this.state.allScans.filter(scan => scan.asset === assetName);
  }

  loadAllProviders() {
    ProviderBackend.getProviders(this.props.account.owner)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            allProviders: res.data || [],
          });
        }
      });
  }

  getProviderForScan(scanProviderName) {
    if (!scanProviderName) {
      return null;
    }
    return this.state.allProviders.find(provider => provider.name === scanProviderName);
  }

  renderTable(assets) {
    const columns = [
      {
        title: i18next.t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text, record, index) => {
          return (
            <Link to={`/assets/${record.name}`}>{text}</Link>
          );
        },
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/assets/${text}`}>{text}</Link>
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
        title: i18next.t("general:Provider"),
        dataIndex: "provider",
        key: "provider",
        width: "150px",
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
        title: i18next.t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("type"),
        render: (text, record, index) => {
          const icon = this.getTypeIcon(text);
          return (
            <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
              {icon && <img src={icon} alt={text} style={{width: "20px", height: "20px"}} />}
              <span>{text}</span>
            </div>
          );
        },
      },
      {
        title: i18next.t("general:ID"),
        dataIndex: "id",
        key: "id",
        width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("id"),
        render: (text, record, index) => {
          return (
            <Tooltip title={text}>
              <span>{Setting.getShortText(text, 25)}</span>
            </Tooltip>
          );
        },
      },
      {
        title: i18next.t("general:Region"),
        dataIndex: "region",
        key: "region",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("region"),
      },
      {
        title: i18next.t("general:Zone"),
        dataIndex: "zone",
        key: "zone",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("zone"),
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("state"),
      },
      {
        title: i18next.t("asset:Properties"),
        dataIndex: "properties",
        key: "properties",
        width: "200px",
        render: (text, record, index) => {
          return (
            <JsonCodeMirrorPopover
              text={text}
              placement="right"
              maxDisplayLength={30}
              width="600px"
              height="500px"
            />
          );
        },
      },
      {
        title: i18next.t("general:Scans"),
        dataIndex: "name",
        key: "scans",
        width: "200px",
        fixed: "right",
        render: (text, record, index) => {
          const scans = this.getScansForAsset(record.name);
          if (scans.length === 0) {
            return <span style={{color: "#999"}}>-</span>;
          }
          return (
            <div style={{display: "flex", flexWrap: "wrap", gap: "4px"}}>
              {scans.map((scan) => {
                const provider = this.getProviderForScan(scan.provider);
                return (
                  <ScanDetailPopover
                    key={scan.name}
                    scan={scan}
                    provider={provider}
                    placement="left"
                  />
                );
              })}
            </div>
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
                <Button type="text" size="small" icon={<EditOutlined />} style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}} onClick={() => this.props.history.push(`/assets/${record.name}`)} />
              </Tooltip>
              <Popconfirm
                title={i18next.t("general:Sure to delete") + `: ${record.name} ?`}
                onConfirm={() => this.deleteAsset(index)}
                disabled={!Setting.isAdminUser(this.props.account)}
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
      pageSize: this.state.pagination.pageSize,
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={assets} rowKey={(record) => `${record.owner}/${record.name}`} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Assets")}
              <span style={{marginLeft: 32}}>
                {i18next.t("general:Provider")}:
                <Select size={"small"}
                  style={{width: 280, marginLeft: 8, marginRight: 16, marginTop: 2}}
                  value={this.state.selectedProvider}
                  onChange={(value) => this.setState({selectedProvider: value})}
                >
                  {this.state.providers.map((provider) => {
                    const logo = this.getProviderLogo(provider.name);
                    return (
                      <Option key={provider.name} value={provider.name}>
                        <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                          {logo && <img src={logo} alt={provider.name} style={{width: "16px", height: "16px"}} />}
                          <span>{provider.name}</span>
                        </div>
                      </Option>
                    );
                  })}
                </Select>
                <Button size={"small"}
                  type="primary"
                  icon={<ReloadOutlined />}
                  loading={this.state.scanning}
                  onClick={() => this.scanAssets()}
                  disabled={!this.state.selectedProvider}
                >
                  {i18next.t("asset:Scan")}
                </Button>
              </span>
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
    AssetBackend.getAssets("admin", params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
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

  render() {
    return (
      <div>
        <div style={{marginTop: 10}}>
          {
            this.renderTable(this.state.data)
          }
        </div>
      </div>
    );
  }
}

export default AssetListPage;
