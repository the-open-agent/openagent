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
import {Avatar, Button, Popconfirm, Switch, Table} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as StoreBackend from "./backend/StoreBackend";
import i18next from "i18next";
import * as Conf from "./Conf";
import * as StorageProviderBackend from "./backend/StorageProviderBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import StoreShareModal from "./StoreShareModal";
import {CopyOutlined, DeleteOutlined, ShareAltOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";

const defaultPrompt = "You are an expert in your field and you specialize in using your knowledge to answer or solve people's problems.";

class StoreListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      generating: {},
      providers: {},
      hideChat: this.getHideChatFromStorage(),
      shareModalVisible: false,
      shareRecord: null,
    };
  }

  openShareModal = (record) => {
    this.setState({shareModalVisible: true, shareRecord: record});
  };

  closeShareModal = () => {
    this.setState({shareModalVisible: false, shareRecord: null});
  };

  UNSAFE_componentWillMount() {
    super.UNSAFE_componentWillMount();
    this.getAllProviders();
  }

  getHideChatFromStorage() {
    const saved = localStorage.getItem("hideChat");
    if (saved === null || saved === undefined) {
      return false;
    }
    return JSON.parse(saved) === true;
  }

  toggleHideChat = () => {
    const newValue = !this.state.hideChat;
    this.setState({
      hideChat: newValue,
    });
    localStorage.setItem("hideChat", JSON.stringify(newValue));
  };

  getAllProviders() {
    this.setState({loading: true});
    const storageProvidersPromise = StorageProviderBackend.getStorageProviders(this.props.account.name);
    Promise.all([
      storageProvidersPromise,
      ProviderBackend.getProviders(this.props.account.name),
    ]).then(([res1, res2]) => {
      if (res1.status !== "ok") {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res1.msg}`);
        this.setState({loading: false});
        return;
      }

      if (res2.status !== "ok") {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res2.msg}`);
        this.setState({loading: false});
        return;
      }

      const newProviders = {};
      res1.data.forEach(provider => {
        newProviders[provider.name] = provider;
      });
      res2.data.forEach(provider => {
        newProviders[provider.name] = provider;
      });

      this.setState({
        providers: newProviders,
        loading: false,
      });
    }).catch(error => {
      Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
      this.setState({loading: false});
    });
  }

  renderProviderInfo(text) {
    const provider = this.state.providers[text];
    if (!provider) {
      return (<a> {text} </a>);
    }

    const providerLogo = (
      <img width={20} height={20} src={Setting.getProviderLogoURL(provider)} alt={provider.name} />
    );

    const isLocalStorage = ["Local File System", "OpenAI File System"].includes(provider.type);
    const providerType = provider.category;

    const openInCasdoorAdmin =
      Setting.isCasdoorAvailable() &&
      !Setting.isBasicLoginMode(this.props.account) &&
      (providerType === "Image" || (providerType === "Storage" && !isLocalStorage));

    if (openInCasdoorAdmin) {
      return (
        <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.props.account).replace("/account", `/providers/admin/${provider.name}`)}>
          {provider.name && providerLogo} {provider.name}
          {Setting.renderExternalLink()}
        </a>
      );
    } else {
      return (
        <Link to={`/providers/${provider.name}`}>
          {provider.name && providerLogo} {provider.name}
        </Link>
      );
    }
  }

  newStore() {
    const randomName = Setting.getRandomName();
    return {
      owner: this.props.account.name,
      name: `store_${randomName}`,
      displayName: `New Store - ${randomName}`,
      createdTime: moment().format(),
      title: `Title - ${randomName}`,
      avatar: Setting.getDefaultAiAvatar(),
      htmlTitle: "",
      faviconUrl: "",
      logoUrl: "",
      footerHtml: "",
      storageProvider: "provider-storage-built-in",
      storageSubpath: `store_${randomName}`,
      imageProvider: "",
      splitProvider: "Default",
      searchProvider: "Default",
      modelProvider: "",
      embeddingProvider: "",
      textToSpeechProvider: "Browser Built-In",
      speechToTextProvider: "Browser Built-In",
      agentProvider: "",
      memoryLimit: 5,
      frequency: 10000,
      limitMinutes: 10,
      welcome: "Hello",
      welcomeTitle: i18next.t("chat:Hello, I'm OpenAgent AI Assistant"),
      welcomeText: i18next.t("chat:I'm here to help answer your questions"),
      prompt: defaultPrompt,
      themeColor: Conf.ThemeDefault.colorPrimary,
      propertiesMap: {},
      knowledgeCount: 5,
      suggestionCount: 3,
      isDefault: false,
      state: "Active",
      enableExtraOptions: Conf.ShowGithubCorner,
    };
  }

  addStore() {
    const newStore = this.newStore();
    StoreBackend.addStore(newStore)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          window.dispatchEvent(new Event("storesChanged"));
          this.props.history.push({
            pathname: `/stores/${newStore.owner}/${newStore.name}`,
            state: {isNewStore: true},
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
    return StoreBackend.deleteStore(this.state.data[i]);
  };

  deleteStore(record) {
    StoreBackend.deleteStore(record)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          window.dispatchEvent(new Event("storesChanged"));
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

  refreshStoreVectors(i) {
    this.setState(prevState => ({
      generating: {
        ...prevState.generating,
        [i]: true,
      },
    }));
    StoreBackend.refreshStoreVectors(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Vectors generated successfully"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Vectors failed to generate")}: ${res.msg}`);
        }
        this.setState(prevState => ({
          generating: {
            ...prevState.generating,
            [i]: false,
          },
        }));
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Vectors failed to generate")}: ${error}`);
        this.setState(prevState => ({
          generating: {
            ...prevState.generating,
            [i]: false,
          },
        }));
      });
  }

  renderTable(stores) {
    const columns = [
      {
        title: i18next.t("general:Owner"),
        dataIndex: "owner",
        key: "owner",
        width: "90px",
        sorter: (a, b) => (a.owner || "").localeCompare(b.owner || ""),
        ...this.getColumnSearchProps("owner"),
        render: (text, record, index) => {
          if (!text || text.startsWith("u-")) {
            return text;
          }

          return (
            <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.props.account).replace("/account", `/users/${Conf.AuthConfig.organizationName}/${text}`)}>
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
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/stores/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        // width: "600px",
        sorter: (a, b) => a.displayName.localeCompare(b.displayName),
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: i18next.t("general:Avatar"),
        dataIndex: "avatar",
        key: "avatar",
        width: "72px",
        align: "center",
        render: (_, record) => {
          return (
            <Avatar src={record.avatar || Setting.getDefaultAiAvatar()} size={40} />
          );
        },
      },
      {
        title: i18next.t("store:Is default"),
        dataIndex: "isDefault",
        key: "isDefault",
        width: "120px",
        sorter: (a, b) => a.isDefault - b.isDefault,
        ...this.getColumnFilterProps("isDefault"),
        render: (text, record, index) => {
          return (
            <Switch disabled checkedChildren={i18next.t("general:ON")} unCheckedChildren={i18next.t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: i18next.t("store:Chat count"),
        dataIndex: "chatCount",
        key: "chatCount",
        width: "130px",
        sorter: (a, b) => a.chatCount - b.chatCount,
        render: (text, record, index) => {
          return (
            <Link to={`/stores/${record.owner}/${record.name}/chats`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("store:Message count"),
        dataIndex: "messageCount",
        key: "messageCount",
        width: "140px",
        sorter: (a, b) => a.messageCount - b.messageCount,
        render: (text, record, index) => {
          return (
            <Link to={`/stores/${record.owner}/${record.name}/messages`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("store:Vector count"),
        dataIndex: "vectorCount",
        key: "vectorCount",
        width: "130px",
        sorter: (a, b) => a.vectorCount - b.vectorCount,
        render: (text, record, index) => {
          return (
            <Link to={`/stores/${record.owner}/${record.name}/vectors`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("store:Storage provider"),
        dataIndex: "storageProvider",
        key: "storageProvider",
        width: "250px",
        sorter: (a, b) => a.storageProvider.localeCompare(b.storageProvider),
        ...this.getColumnSearchProps("storageProvider"),
        render: (text, record, index) => {
          if (text === "") {
            return null;
          }
          return this.renderProviderInfo(text);
        },
      },
      // {
      //   title: i18next.t("store:Split provider"),
      //   dataIndex: "splitProvider",
      //   key: "splitProvider",
      //   width: "200px",
      //   sorter: (a, b) => a.splitProvider.localeCompare(b.splitProvider),
      // },
      {
        title: i18next.t("store:Image provider"),
        dataIndex: "imageProvider",
        key: "imageProvider",
        width: "300px",
        sorter: (a, b) => a.imageProvider.localeCompare(b.imageProvider),
        ...this.getColumnSearchProps("imageProvider"),
        render: (text, record, index) => {
          return this.renderProviderInfo(text);
        },
      },
      {
        title: i18next.t("provider:Model provider"),
        dataIndex: "modelProvider",
        key: "modelProvider",
        width: "330px",
        sorter: (a, b) => a.modelProvider.localeCompare(b.modelProvider),
        ...this.getColumnSearchProps("modelProvider"),
        render: (text, record, index) => {
          return this.renderProviderInfo(text);
        },
      },
      {
        title: i18next.t("store:Embedding provider"),
        dataIndex: "embeddingProvider",
        key: "embeddingProvider",
        width: "300px",
        sorter: (a, b) => a.embeddingProvider.localeCompare(b.embeddingProvider),
        ...this.getColumnSearchProps("embeddingProvider"),
        render: (text, record, index) => {
          return this.renderProviderInfo(text);
        },
      },
      {
        title: i18next.t("store:Text-to-Speech provider"),
        dataIndex: "textToSpeechProvider",
        key: "textToSpeechProvider",
        width: "300px",
        sorter: (a, b) => a.textToSpeechProvider.localeCompare(b.textToSpeechProvider),
        ...this.getColumnSearchProps("textToSpeechProvider"),
        render: (text, record, index) => {
          return this.renderProviderInfo(text);
        },
      },
      {
        title: i18next.t("store:Speech-to-Text provider"),
        dataIndex: "speechToTextProvider",
        key: "speechToTextProvider",
        width: "280px",
        sorter: (a, b) => a.speechToTextProvider.localeCompare(b.speechToTextProvider),
        ...this.getColumnSearchProps("speechToTextProvider"),
        render: (text) => {
          return this.renderProviderInfo(text);
        },
      },
      {
        title: i18next.t("store:Agent provider"),
        dataIndex: "agentProvider",
        key: "agentProvider",
        width: "250px",
        sorter: (a, b) => a.agentProvider.localeCompare(b.agentProvider),
        ...this.getColumnSearchProps("agentProvider"),
        render: (text) => {
          return this.renderProviderInfo(text);
        },
      },
      {
        title: i18next.t("general:Tools"),
        dataIndex: "tools",
        key: "tools",
        width: "280px",
        render: (arr) => {
          if (!arr || !arr.length) {
            return "";
          }
          return arr.join(", ");
        },
      },
      {
        title: i18next.t("store:Memory limit"),
        dataIndex: "memoryLimit",
        key: "memoryLimit",
        width: "130px",
        sorter: (a, b) => a.memoryLimit - b.memoryLimit,
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "90px",
        sorter: (a, b) => a.state.localeCompare(b.state),
        ...this.getColumnSearchProps("state"),
        render: (text) => {
          return text === "Active" ? Setting.getDisplayTag(i18next.t("general:Active"), "green") : Setting.getDisplayTag(i18next.t("general:Inactive"), "red");
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "430px",
        fixed: "right",
        render: (text, record, index) => {
          if (this.state.hideChat) {
            return (
              <div>
                <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} onClick={() => this.props.history.push(`/stores/${record.owner}/${record.name}/view`)}>{i18next.t("general:Files")}</Button>
                {
                  !Setting.isLocalAdminUser(this.props.account) ? null : (
                    <React.Fragment>
                      <Button style={{marginBottom: "10px", marginRight: "10px"}} icon={<ShareAltOutlined />} onClick={() => this.openShareModal(record)}>{i18next.t("store:Share")}</Button>
                      <Button style={{marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/stores/${record.owner}/${record.name}`)}>{i18next.t("general:Edit")}</Button>
                      <Popconfirm
                        title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                        onConfirm={() => this.deleteStore(record)}
                        okText={i18next.t("general:OK")}
                        cancelText={i18next.t("general:Cancel")}
                        disabled={record.isDefault || Setting.isUserBoundToStore(this.props.account)}
                      >
                        <Button style={{marginBottom: "10px"}} type="primary" danger disabled={record.isDefault || Setting.isUserBoundToStore(this.props.account)}>{i18next.t("general:Delete")}</Button>
                      </Popconfirm>
                    </React.Fragment>
                  )
                }
              </div>
            );
          }

          return (
            <div>
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} onClick={() => this.props.history.push(`/stores/${record.owner}/${record.name}/view`)}>{i18next.t("general:Files")}</Button>
              <Button style={{marginBottom: "10px", marginRight: "10px"}} icon={<CopyOutlined />} onClick={() => {copy(`${window.location.origin}/${record.owner}/${record.name}/chat`);Setting.showMessage("success", i18next.t("general:Successfully copied"));}}>{i18next.t("general:Copy Link")}</Button>
              <Button style={{marginBottom: "10px", marginRight: "10px"}} onClick={() => {
                Setting.setStore(record.name);
                window.open(`${window.location.origin}/${record.owner}/${record.name}/chat`, "_blank");
              }}>{i18next.t("store:Open Chat")}</Button>
              {
                !Setting.isLocalAdminUser(this.props.account) ? null : (
                  <React.Fragment>
                    <Button style={{marginBottom: "10px", marginRight: "10px"}} icon={<ShareAltOutlined />} onClick={() => this.openShareModal(record)}>{i18next.t("store:Share")}</Button>
                    <Button style={{marginBottom: "10px", marginRight: "10px"}} loading={this.state.generating[index]} onClick={() => this.refreshStoreVectors(index)}>{i18next.t("general:Refresh Vectors")}</Button>
                    <Button style={{marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/stores/${record.owner}/${record.name}`)}>{i18next.t("general:Edit")}</Button>
                    <Popconfirm
                      title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                      onConfirm={() => this.deleteStore(record)}
                      okText={i18next.t("general:OK")}
                      cancelText={i18next.t("general:Cancel")}
                      disabled={record.isDefault || Setting.isUserBoundToStore(this.props.account)}
                    >
                      <Button style={{marginBottom: "10px"}} type="primary" danger disabled={record.isDefault || Setting.isUserBoundToStore(this.props.account)}>{i18next.t("general:Delete")}</Button>
                    </Popconfirm>
                  </React.Fragment>
                )
              }
            </div>
          );
        },
      },
    ];
    let filteredColumns = Setting.filterTableColumns(columns, this.props.formItems ?? this.state.formItems);

    if (this.state.hideChat) {
      filteredColumns = filteredColumns.filter(column =>
        column.key !== "chatCount" && column.key !== "messageCount" && column.key !== "vectorCount" && column.key !== "imageProvider" && column.key !== "modelProvider" && column.key !== "embeddingProvider" &&
        column.key !== "textToSpeechProvider" && column.key !== "speechToTextProvider" && column.key !== "agentProvider" && column.key !== "tools" && column.key !== "memoryLimit"
      );
    }

    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <StoreShareModal
          open={this.state.shareModalVisible}
          store={this.state.shareRecord}
          onCancel={this.closeShareModal}
          onSuccess={() => {
            this.fetch({
              pagination: this.state.pagination,
              searchText: this.state.searchText,
              searchedColumn: this.state.searchedColumn,
            });
          }}
        />
        <Table scroll={{x: "max-content"}} columns={filteredColumns} dataSource={stores} rowKey="name" rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Stores")}&nbsp;&nbsp;&nbsp;&nbsp;
              {
                !Setting.isLocalAdminUser(this.props.account) ? null : (
                  <>
                    <Button type="primary" size="small" onClick={this.addStore.bind(this)} disabled={Setting.isUserBoundToStore(this.props.account)}>{i18next.t("general:Add")}</Button>
                    {this.state.selectedRowKeys.length > 0 && (
                      <Popconfirm title={`${i18next.t("general:Sure to delete")}: ${this.state.selectedRowKeys.length} ${i18next.t("general:items")} ?`} onConfirm={() => this.performBulkDelete(this.state.selectedRows, this.state.selectedRowKeys)} okText={i18next.t("general:OK")} cancelText={i18next.t("general:Cancel")}>
                        <Button type="primary" danger size="small" icon={<DeleteOutlined />} style={{marginLeft: 8}}>
                          {i18next.t("general:Delete")} ({this.state.selectedRowKeys.length})
                        </Button>
                      </Popconfirm>
                    )}
                  </>
                )
              }
              <span style={{marginLeft: 32}}>
                {i18next.t("store:Hide chat")}:
                <Switch checked={this.state.hideChat} onChange={this.toggleHideChat} style={{marginLeft: 8}} />
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
    StoreBackend.getGlobalStores(Setting.getRequestStore(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
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

export default StoreListPage;
