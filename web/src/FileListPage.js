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
import {Button, Popconfirm, Table} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as FileBackend from "./backend/FileBackend";
import * as StoreBackend from "./backend/StoreBackend";
import i18next from "i18next";
import {DeleteOutlined} from "@ant-design/icons";

class FileListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      refreshing: {},
    };
  }

  newFile() {
    const randomName = Setting.getRandomName();
    const storeName = Setting.isDefaultStoreSelected(this.props.account) ? "store-built-in" : Setting.getRequestStore(this.props.account);
    const objectKey = `file/file_${randomName}.txt`;
    return {
      owner: "admin",
      name: `${storeName}_${objectKey}`,
      createdTime: moment().format(),
      filename: `file_${randomName}.txt`,
      size: 0,
      store: storeName,
      storageProvider: "",
      tokenCount: 0,
      status: "Pending",
      errorText: "",
    };
  }

  addFile = async() => {
    let storeName;
    if (Setting.isDefaultStoreSelected(this.props.account)) {
      try {
        const res = await StoreBackend.getStore("admin", "_default_store_");
        if (res.status === "ok" && res.data?.name) {
          storeName = res.data.name;
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          return;
        }
      } catch (error) {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
        return;
      }
    } else {
      storeName = Setting.getRequestStore(this.props.account);
      if (!storeName) {
        Setting.showMessage("error", i18next.t("general:Store is not available"));
        return;
      }
    }
    this.props.history.push(`/stores/admin/${storeName}/view`);
  };

  deleteItem = async(i) => {
    return FileBackend.deleteFile(this.state.data[i]);
  };

  deleteFile(record) {
    FileBackend.deleteFile(record)
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

  refreshFileVectors(index) {
    this.setState(prevState => ({
      refreshing: {
        ...prevState.refreshing,
        [index]: true,
      },
    }));
    FileBackend.refreshFileVectors(this.state.data[index])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Vectors generated successfully"));
          this.fetch({pagination: this.state.pagination});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Vectors failed to generate")}: ${res.msg}`);
        }
        this.setState(prevState => ({
          refreshing: {
            ...prevState.refreshing,
            [index]: false,
          },
        }));
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Vectors failed to generate")}: ${error}`);
        this.setState(prevState => ({
          refreshing: {
            ...prevState.refreshing,
            [index]: false,
          },
        }));
      });
  }

  renderTable(files) {
    const columns = [
      {
        title: i18next.t("general:Store"),
        dataIndex: "store",
        key: "store",
        width: "130px",
        sorter: (a, b) => a.store.localeCompare(b.store),
        ...this.getColumnSearchProps("store"),
        render: (text, record, index) => {
          return (
            <Link to={`/stores/${record.owner}/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "140px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/files/${encodeURIComponent(text)}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("file:Filename"),
        dataIndex: "filename",
        key: "filename",
        width: "200px",
        sorter: (a, b) => a.filename.localeCompare(b.filename),
        ...this.getColumnSearchProps("filename"),
      },
      {
        title: i18next.t("general:Size"),
        dataIndex: "size",
        key: "size",
        width: "100px",
        sorter: (a, b) => a.size - b.size,
        render: (text, record, index) => {
          return Setting.getFormattedSize(text);
        },
      },
      {
        title: i18next.t("store:Storage provider"),
        dataIndex: "storageProvider",
        key: "storageProvider",
        width: "150px",
        sorter: (a, b) => a.storageProvider.localeCompare(b.storageProvider),
        ...this.getColumnSearchProps("storageProvider"),
        render: (text, record, index) => {
          return (
            <Link to={`/providers/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("chat:Token count"),
        dataIndex: "tokenCount",
        key: "tokenCount",
        width: "110px",
        sorter: (a, b) => a.tokenCount - b.tokenCount,
      },
      {
        title: i18next.t("general:Status"),
        dataIndex: "status",
        key: "status",
        width: "100px",
        sorter: (a, b) => a.status.localeCompare(b.status),
        ...this.getColumnSearchProps("status"),
      },
      {
        title: i18next.t("message:Error text"),
        dataIndex: "errorText",
        key: "errorText",
        width: "200px",
        sorter: (a, b) => a.errorText.localeCompare(b.errorText),
        ...this.getColumnSearchProps("errorText"),
        render: (text, record, index) => {
          return (
            <div dangerouslySetInnerHTML={{__html: text}} />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "260px",
        fixed: "right",
        render: (text, record, index) => {
          return (
            <div>
              {
                !Setting.isLocalAdminUser(this.props.account) ? null : (
                  <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} loading={this.state.refreshing[index]} onClick={() => this.refreshFileVectors(index)}>{i18next.t("general:Refresh Vectors")}</Button>
                )
              }
              <Button style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}} type="primary" onClick={() => this.props.history.push(`/files/${encodeURIComponent(record.name)}`)}>{i18next.t("general:View")}</Button>
              <Popconfirm
                title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteFile(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Button style={{marginBottom: "10px"}} type="primary" danger>{i18next.t("general:Delete")}</Button>
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
      pageSizeOptions: ["10", "20", "50", "100", "1000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={filteredColumns} dataSource={files} rowKey="name" rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Files")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addFile.bind(this)}>{i18next.t("general:Add")}</Button>
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
    //     const field = params.searchedColumn, value = params.searchText;
    //     const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    const store = this.state.storeName;
    FileBackend.getFiles("admin", store)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data?.length || 0,
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

export default FileListPage;
