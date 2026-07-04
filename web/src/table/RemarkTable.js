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
import {Button, Col, Input, Row, Select, Switch, Table, Tooltip} from "antd";
import {DeleteOutlined, DownOutlined, UpOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";
import UserLabel from "../common/UserLabel";
import i18next from "i18next";
import moment from "moment/moment";

const {TextArea} = Input;
const {Option} = Select;

class RemarkTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table) {
    this.props.onUpdateTable(table);
  }

  parseField(key, value) {
    if (key === "data") {
      value = Setting.trim(value, ",");
      return value.split(",").map(i => Setting.myParseInt(i));
    }

    if ([].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateField(table, index, key, value) {
    value = this.parseField(key, value);

    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table) {
    const row = {no: table.length, timestamp: moment().format(), user: this.props.account.name};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table, i) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table, i) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table, i) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  requireSelfOrAdmin(row) {
    if (!this.requireAdmin()) {
      return false;
    }

    return !(row.user === this.props.account.name);
  }

  requireSelfOrAdminForView(row) {
    if (this.props.title !== i18next.t("video:Remarks1") || this.props.account.type !== "video-reviewer1-user") {
      return false;
    }

    return !(row.user === this.props.account.name);
  }

  filterRemark1Value(row, value) {
    if (this.requireSelfOrAdminForView(row)) {
      if (typeof value === "boolean") {
        return false;
      } else {
        return "***";
      }
    } else {
      return value;
    }
  }

  requireReviewer() {
    return !(this.props.account.type === "video-reviewer1-user" || this.props.account.type === "video-reviewer2-user");
  }

  requireAdmin() {
    if (Setting.isAdminUser(this.props.account)) {
      return false;
    }

    return !(this.props.account.type === "video-admin-user");
  }

  renderTable(table) {
    const columns = [
      {
        title: i18next.t("general:No."),
        dataIndex: "no",
        key: "no",
        width: "60px",
        render: (text, record, index) => {
          return (index + 1);
        },
      },
      {
        title: i18next.t("video:Time"),
        dataIndex: "timestamp",
        key: "timestamp",
        width: "160px",
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "110px",
        render: (text, record, index) => {
          if (this.requireSelfOrAdminForView(record)) {
            return "***";
          }

          return <UserLabel user={text} account={this.props.account} size={22} />;
        },
      },
      {
        title: i18next.t("task:Score"),
        dataIndex: "score",
        key: "score",
        width: "130px",
        render: (text, record, index) => {
          return (
            <Select disabled={this.props.disabled || this.requireSelfOrAdmin(record)} virtual={false} style={{width: "100%"}} value={this.filterRemark1Value(record, text)} onChange={(value => {
              this.updateField(table, index, "score", value);
            })}>
              {
                [
                  {id: "Excellent"},
                  {id: "Good"},
                  {id: "Pass"},
                  {id: "Fail"},
                ].map((item, index) => <Option key={index} value={item.id}>{Setting.getRemarkTag(item.id)}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: i18next.t("video:Is recommended"),
        dataIndex: "isPublic",
        key: "isPublic",
        width: "110px",
        render: (text, record, index) => {
          return (
            <Switch disabled={this.props.disabled || this.requireSelfOrAdmin(record)} checked={this.filterRemark1Value(record, text)} onChange={checked => {
              this.updateField(table, index, "isPublic", checked);
            }} />
          );
        },
      },
      {
        title: i18next.t("message:Comment"),
        dataIndex: "text",
        key: "text",
        // width: '300px',
        render: (text, record, index) => {
          return (
            <TextArea disabled={this.props.disabled || this.requireSelfOrAdmin(record)} showCount maxLength={250} autoSize={{minRows: 1, maxRows: 15}} value={this.filterRemark1Value(record, text)} onChange={(e) => {
              this.updateField(table, index, "text", e.target.value);
            }} />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        key: "action",
        width: "100px",
        render: (text, record, index) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={"Up"}>
                <Button style={{marginRight: "5px"}} disabled={index === 0 || this.props.disabled || this.requireAdmin()} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={"Down"}>
                <Button style={{marginRight: "5px"}} disabled={index === table.length - 1 || this.props.disabled || this.requireAdmin()} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={"Delete"}>
                <Button icon={<DeleteOutlined />} size="small" disabled={this.props.disabled || this.requireSelfOrAdmin(record)} onClick={() => this.deleteRow(table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    const myRowCount = table.filter((row) => row.user === this.props.account.name).length;

    return (
      <Table rowKey="index" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
            <Button style={{marginRight: "5px"}} type="primary" size="small" disabled={this.props.maxRowCount > 0 && table.length >= this.props.maxRowCount || myRowCount >= 1 || this.props.disabled || this.requireReviewer()} onClick={() => this.addRow(table)}>{i18next.t("general:Add")}</Button>
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        <Row style={{marginTop: "20px"}} >
          <Col span={24}>
            {
              this.renderTable(this.props.table)
            }
          </Col>
        </Row>
      </div>
    );
  }
}

export default RemarkTable;
