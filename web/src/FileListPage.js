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
import {Button, Image, Popconfirm, Table, Tooltip, Upload} from "antd";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import UserLabel from "./common/UserLabel";
import * as FileBackend from "./backend/FileBackend";
import * as StorageProviderBackend from "./backend/StorageProviderBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import i18next from "i18next";
import {DeleteOutlined, NodeIndexOutlined, ReloadOutlined, UploadOutlined} from "@ant-design/icons";

class FileListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      refreshing: {},
      providers: {},
    };
    this.uploadedFileIdMap = {};
  }

  componentDidMount() {
    super.componentDidMount?.();
    Promise.all([
      StorageProviderBackend.getStorageProviders(this.props.account?.name),
      ProviderBackend.getProviders(this.props.account?.name),
    ]).then(([res1, res2]) => {
      const providers = {};
      if (res1.status === "ok") {
        res1.data.forEach(p => {providers[p.name] = p;});
      }
      if (res2.status === "ok") {
        res2.data.forEach(p => {providers[p.name] = p;});
      }
      this.setState({providers});
    });
  }

  uploadFile = (file, info) => {
    const promises = [];
    info.fileList.forEach((uploadedFile) => {
      if (this.uploadedFileIdMap[uploadedFile.originFileObj.uid] === 1) {
        return;
      }
      this.uploadedFileIdMap[uploadedFile.originFileObj.uid] = 1;
      promises.push(FileBackend.uploadFile(uploadedFile.name, uploadedFile.originFileObj, Setting.getStoreCurrent() || ""));
    });

    if (promises.length === 0) {
      return;
    }

    Promise.all(promises)
      .then((values) => {
        let hasError = false;
        values.forEach((res) => {
          if (res.status !== "ok") {
            hasError = true;
            Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
          }
        });
        if (!hasError) {
          Setting.showMessage("success", i18next.t("general:Successfully uploaded"));
        }
        this.fetch({pagination: this.state.pagination});
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
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
        title: i18next.t("general:Owner"),
        dataIndex: "owner",
        key: "owner",
        width: "130px",
        sorter: (a, b) => (a.owner || "").localeCompare(b.owner || ""),
        ...this.getColumnSearchProps("owner"),
        render: (text, record, index) => {
          if (!text || text.startsWith("u-")) {
            return text;
          }
          return <UserLabel user={text} account={this.props.account} size={22} />;
        },
      },
      {
        title: i18next.t("general:Store"),
        dataIndex: "store",
        key: "store",
        width: "150px",
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
        title: i18next.t("store:Storage"),
        dataIndex: "storageProvider",
        key: "storageProvider",
        width: "120px",
        sorter: (a, b) => a.storageProvider.localeCompare(b.storageProvider),
        ...this.getColumnSearchProps("storageProvider"),
        render: (text, record, index) => {
          const provider = this.state.providers[text];
          const logoUrl = provider ? Setting.getProviderLogoURL(provider) : "";
          const icon = logoUrl
            ? <img width={24} height={24} src={logoUrl} alt={text} style={{objectFit: "contain"}} />
            : <span>{text}</span>;
          return (
            <Tooltip title={text}>
              <Link to={`/providers/${text}`}>
                {icon}
              </Link>
            </Tooltip>
          );
        },
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "180px",
        sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        defaultSortOrder: "descend",
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("file:Filename"),
        dataIndex: "filename",
        key: "filename",
        sorter: (a, b) => a.filename.localeCompare(b.filename),
        ...this.getColumnSearchProps("filename"),
        render: (text, record) => {
          const inner = (
            <span style={{display: "inline-flex", alignItems: "center", gap: "6px"}}>
              <Setting.IconFont type={Setting.getFileIconType(text)} style={{fontSize: "18px"}} />
              {text}
            </span>
          );
          if (!record.url) {
            return inner;
          }
          return (
            <a href={record.url} target="_blank" rel="noreferrer" download>
              {inner}
            </a>
          );
        },
      },
      {
        title: i18next.t("general:Size"),
        dataIndex: "size",
        key: "size",
        width: "120px",
        sorter: (a, b) => a.size - b.size,
        render: (text, record, index) => {
          return Setting.getFormattedSize(text);
        },
      },
      {
        title: i18next.t("store:Vector count"),
        dataIndex: "vectorCount",
        key: "vectorCount",
        width: "130px",
        sorter: (a, b) => a.vectorCount - b.vectorCount,
        render: (text, record) => {
          const objectKey = record.name.startsWith(`${record.store}_`)
            ? record.name.substring(record.store.length + 1)
            : record.name;
          return (
            <a onClick={() => this.props.history.push(`/vectors?file=${encodeURIComponent(objectKey)}`)}>
              {text}
            </a>
          );
        },
      },
      {
        title: i18next.t("chat:Token count"),
        dataIndex: "tokenCount",
        key: "tokenCount",
        width: "130px",
        sorter: (a, b) => a.tokenCount - b.tokenCount,
      },
      {
        title: i18next.t("general:Preview"),
        dataIndex: "url",
        key: "preview",
        width: "150px",
        fixed: "right",
        render: (text, record) => {
          if (!record.url) {
            return null;
          }
          const ext = record.filename?.split(".").pop()?.toLowerCase();
          if (!["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "ico", "tiff", "tif"].includes(ext)) {
            return null;
          }
          return (
            <Image
              src={record.url}
              width={80}
              height={80}
              style={{objectFit: "contain", borderRadius: "4px"}}
              preview={{src: record.url}}
            />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "160px",
        fixed: "right",
        render: (text, record, index) => {
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Tooltip title={i18next.t("vector:View Vector")}>
                <Button
                  type="text"
                  size="small"
                  icon={<NodeIndexOutlined />}
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  onClick={() => {
                    const objectKey = record.name.startsWith(`${record.store}_`)
                      ? record.name.substring(record.store.length + 1)
                      : record.name;
                    this.props.history.push(`/vectors?file=${encodeURIComponent(objectKey)}`);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteFile(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Tooltip title={i18next.t("general:Delete")}>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  />
                </Tooltip>
              </Popconfirm>
              {!Setting.isLocalAdminUser(this.props.account) ? null : (
                <Tooltip title={i18next.t("general:Refresh Vectors")}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                    loading={this.state.refreshing[index]}
                    onClick={() => this.refreshFileVectors(index)}
                  />
                </Tooltip>
              )}
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
              <Upload directory={false} multiple={true} accept="*" showUploadList={false} beforeUpload={() => false} onChange={(info) => this.uploadFile(info.file, info)}>
                <Button type="primary" size="small" icon={<UploadOutlined />}>{i18next.t("general:Upload")}</Button>
              </Upload>
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
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    FileBackend.getGlobalFiles(Setting.getRequestStore(this.props.account), params.pagination?.current, params.pagination?.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data2 !== undefined ? res.data2 : (res.data?.length || 0),
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
