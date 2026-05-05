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
import {Button, Image, Popconfirm, Table, Tag, Upload} from "antd";
import {DeleteOutlined, UploadOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as ResourceBackend from "./backend/ResourceBackend";
import i18next from "i18next";

function getCategoryColor(category) {
  if (category === "avatar") {return "blue";}
  if (category === "chat") {return "green";}
  if (category === "document") {return "orange";}
  return "default";
}

const errorImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABsUlEQVR4nO2YMU7DQBBF3yZBpEiBkCiRuAMHoOICHICSE3ABTkBJSZMTUFBRIlFR0iSioCQoSiQKJCQkJCSkhIQEJCT+j2UlG8c7u97xrmTpSaPxzp+Z3Z21QBAEQRCEf4MxZhmoBXjvR+5+BVSAp5ltABVg58/qwIl374CXQH2wAXqgAXqAlS3qAXqAlS3qAXqABbqKxQbHp63z+yCO2c6AFdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBKkDHdBVbDc4Pm2dT7LLBH8Bvr4rqP5qiGIAAAAASUVORK5CYII=";

class ResourceListPage extends BaseListPage {
  componentDidMount() {
    this.setState({uploading: false});
  }

  handleUpload(info) {
    this.setState({uploading: true});
    const file = info.file;
    const account = this.props.account;
    ResourceBackend.uploadResource(account.name, "avatar", "", "", file)
      .then(res => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully uploaded"));
          const {pagination} = this.state;
          this.fetch({pagination});
        } else {
          Setting.showMessage("error", res.msg);
        }
      })
      .finally(() => {
        this.setState({uploading: false});
      });
  }

  deleteResource(i) {
    ResourceBackend.deleteResource(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          this.fetch({
            pagination: {
              ...this.state.pagination,
              current: this.state.pagination.current > 1 && this.state.data.length === 1
                ? this.state.pagination.current - 1
                : this.state.pagination.current,
            },
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderUpload() {
    return (
      <Upload maxCount={1} showUploadList={false} beforeUpload={() => false} onChange={info => this.handleUpload(info)}>
        <Button icon={<UploadOutlined />} loading={this.state.uploading} type="primary" size="small">
          {i18next.t("resource:Upload a file...")}
        </Button>
      </Upload>
    );
  }

  renderTable(resources) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("name"),
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "160px",
        sorter: true,
        render: (text) => Setting.getFormattedDate(text),
      },
      {
        title: i18next.t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("user"),
      },
      {
        title: i18next.t("general:Category"),
        dataIndex: "category",
        key: "category",
        width: "100px",
        sorter: true,
        ...this.getColumnSearchProps("category"),
        render: (text) => <Tag color={getCategoryColor(text)}>{text}</Tag>,
      },
      {
        title: i18next.t("store:File name"),
        dataIndex: "fileName",
        key: "fileName",
        sorter: true,
        ...this.getColumnSearchProps("fileName"),
      },
      {
        title: i18next.t("general:Type"),
        dataIndex: "fileType",
        key: "fileType",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("fileType"),
      },
      {
        title: i18next.t("resource:Format"),
        dataIndex: "fileFormat",
        key: "fileFormat",
        width: "80px",
        sorter: true,
        ...this.getColumnSearchProps("fileFormat"),
      },
      {
        title: i18next.t("store:File size"),
        dataIndex: "fileSize",
        key: "fileSize",
        width: "100px",
        sorter: true,
        render: (text) => Setting.getFriendlyFileSize(text),
      },
      {
        title: i18next.t("general:Preview"),
        dataIndex: "preview",
        key: "preview",
        width: "120px",
        fixed: Setting.isMobile() ? "false" : "right",
        render: (_, record) => {
          if (!record.url) {return null;}
          if (record.fileType === "image") {
            return (
              <Image width={80} src={record.url} fallback={errorImageBase64} />
            );
          }
          if (record.fileType === "video") {
            return (
              <video width={80} controls>
                <source src={record.url} type="video/mp4" />
              </video>
            );
          }
          return null;
        },
      },
      {
        title: i18next.t("general:URL"),
        dataIndex: "url",
        key: "url",
        width: "110px",
        fixed: Setting.isMobile() ? "false" : "right",
        render: (_, record) => (
          <Button
            size="small"
            onClick={() => {
              copy(record.url);
              Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
            }}
          >
            {i18next.t("general:Copy Link")}
          </Button>
        ),
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "",
        key: "op",
        width: "150px",
        fixed: Setting.isMobile() ? "false" : "right",
        render: (_, record, index) => (
          <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
            <Popconfirm
              title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
              onConfirm={() => this.deleteResource(index)}
              okText={i18next.t("general:OK")}
              cancelText={i18next.t("general:Cancel")}
            >
              <Button
                style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                type="primary"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </div>
        ),
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
        <Table
          scroll={{x: "max-content"}}
          columns={columns}
          dataSource={resources}
          rowKey="name"
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Resources")}&nbsp;&nbsp;&nbsp;&nbsp;
              {this.renderUpload()}
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
    ResourceBackend.getGlobalResources("", params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({loading: false});
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
            this.setState({isAuthorized: false});
          } else {
            Setting.showMessage("error", res.msg);
          }
        }
      });
  };
}

export default ResourceListPage;
