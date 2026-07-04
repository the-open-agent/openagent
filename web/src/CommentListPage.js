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
import {Button, Popconfirm, Table, Tooltip} from "antd";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import UserLabel from "./common/UserLabel";
import * as CommentBackend from "./backend/CommentBackend";
import i18next from "i18next";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import {truncateCommentText} from "./comment/commentContentUtils";

class CommentListPage extends BaseListPage {
  deleteItem = async(i) => {
    return CommentBackend.deleteComment(this.state.data[i].owner, this.state.data[i].name);
  };

  deleteComment(i) {
    CommentBackend.deleteComment(this.state.data[i].owner, this.state.data[i].name)
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
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  renderTable(comments) {
    const columns = [
      {
        title: i18next.t("general:Owner"),
        dataIndex: "owner",
        key: "owner",
        width: "120px",
        sorter: (a, b) => a.owner.localeCompare(b.owner),
        ...this.getColumnSearchProps("owner"),
        render: (text) => (text && !text.startsWith("u-") ? <UserLabel user={text} account={this.props.account} size={22} /> : text),
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text, record) => (
          <Link to={`/comments/${record.owner}/${text}`}>{text}</Link>
        ),
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "160px",
        sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        render: (text) => Setting.getFormattedDate(text),
      },
      {
        title: i18next.t("comment:Target type"),
        dataIndex: "targetType",
        key: "targetType",
        width: "110px",
        sorter: (a, b) => a.targetType.localeCompare(b.targetType),
        ...this.getColumnSearchProps("targetType"),
      },
      {
        title: i18next.t("comment:Target key"),
        dataIndex: "targetKey",
        key: "targetKey",
        width: "180px",
        sorter: (a, b) => a.targetKey.localeCompare(b.targetKey),
        ...this.getColumnSearchProps("targetKey"),
        render: (text, record) => {
          if (record.targetType === "agenthub") {
            return <Link to={`/agents/${text}`}>{text}</Link>;
          }
          return text;
        },
      },
      {
        title: i18next.t("general:Content"),
        dataIndex: "content",
        key: "content",
        ...this.getColumnSearchProps("content"),
        render: (text) => {
          return truncateCommentText(text, 80);
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "110px",
        fixed: "right",
        render: (text, record, index) => (
          <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
            <Tooltip title={i18next.t("general:Edit")}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                onClick={() => this.props.history.push(`/comments/${record.owner}/${record.name}`)}
              />
            </Tooltip>
            <Popconfirm
              title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
              onConfirm={() => this.deleteComment(index)}
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
          </div>
        ),
      },
    ];

    const paginationProps = {
      pageSize: this.state.pagination.pageSize,
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table
          scroll={{x: "max-content"}}
          columns={columns}
          dataSource={comments}
          rowKey={(record) => `${record.owner}/${record.name}`}
          rowSelection={this.getRowSelection()}
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Comments")}&nbsp;&nbsp;&nbsp;&nbsp;
              {this.state.selectedRowKeys.length > 0 && (
                <Popconfirm
                  title={`${i18next.t("general:Sure to delete")}: ${this.state.selectedRowKeys.length} ${i18next.t("general:items")} ?`}
                  onConfirm={() => this.performBulkDelete(this.state.selectedRows, this.state.selectedRowKeys)}
                  okText={i18next.t("general:OK")}
                  cancelText={i18next.t("general:Cancel")}
                >
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
    const field = params.searchedColumn;
    const value = params.searchText;
    const sortField = params.sortField;
    const sortOrder = params.sortOrder;
    this.setState({loading: true});
    CommentBackend.getGlobalComments(params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({loading: false});
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data2,
            },
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({loading: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  };
}

export default CommentListPage;
