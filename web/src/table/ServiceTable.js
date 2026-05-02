// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
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
import {CheckCircleOutlined, DeleteOutlined, DownOutlined, MinusCircleOutlined, SyncOutlined, UpOutlined} from "@ant-design/icons";
import {Button, Col, Input, Row, Select, Table, Tag, Tooltip} from "antd";
import * as Setting from "../Setting";

const {Option} = Select;

class ServiceTable extends React.Component {
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
    if (["no", "port", "processId"].includes(key)) {
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
    const row = {no: table.length, name: `New Service - ${table.length}`, path: "C:/github_repos/openagent", port: 10000, processId: -1, expectedStatus: "Stopped", status: "", subStatus: "", message: ""};
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

  renderTable(table) {
    const columns = [
      {
        title: "No.",
        dataIndex: "no",
        key: "no",
        width: "60px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "no", e.target.value);
            }} />
          );
        },
      },
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        width: "180px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "name", e.target.value);
            }} />
          );
        },
      },
      {
        title: "Path",
        dataIndex: "path",
        key: "path",
        width: "300px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "path", e.target.value);
            }} />
          );
        },
      },
      {
        title: "Port",
        dataIndex: "port",
        key: "port",
        width: "100px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "port", e.target.value);
            }} />
          );
        },
      },
      {
        title: "Process ID",
        dataIndex: "processId",
        key: "processId",
        width: "100px",
        render: (text, record, index) => {
          if (text === -1) {
            return null;
          } else {
            return text;
          }
        },
      },
      {
        title: "Expected status",
        dataIndex: "expectedStatus",
        key: "expectedStatus",
        width: "150px",
        render: (text, record, index) => {
          return (
            <Select virtual={false} style={{width: "100%"}} value={text} onChange={value => {this.updateField(table, index, "expectedStatus", value);}}>
              {
                [
                  {id: "Running", name: "Running"},
                  {id: "Stopped", name: "Stopped"},
                ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
              }
            </Select>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: "150px",
        render: (text, record, index) => {
          if (record.subStatus === "In Progress") {
            return (
              <Tag icon={<SyncOutlined spin />} color="processing">{`${text} (${record.subStatus})`}</Tag>
            );
          } else if (record.status === "Running") {
            return (
              <Tag icon={<CheckCircleOutlined />} color="success">{text}</Tag>
            );
          } else if (record.status === "Stopped") {
            return (
              <Tag icon={<MinusCircleOutlined />} color="error">{text}</Tag>
            );
          } else {
            return `${text} (${record.subStatus})`;
          }
        },
      },
      // {
      //   title: 'Sub Status',
      //   dataIndex: 'subStatus',
      //   key: 'subStatus',
      //   render: (text, record, index) => {
      //     return (
      //       <Input value={text} onChange={e => {
      //         this.updateField(table, index, 'subStatus', e.target.value);
      //       }} />
      //     )
      //   }
      // },
      {
        title: "Message",
        dataIndex: "message",
        key: "message",
      },
      {
        title: "Action",
        key: "action",
        width: "100px",
        render: (text, record, index) => {
          return (
            <div>
              <Tooltip placement="bottomLeft" title={"Up"}>
                <Button style={{marginRight: "5px"}} disabled={index === 0} icon={<UpOutlined />} size="small" onClick={() => this.upRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={"Down"}>
                <Button style={{marginRight: "5px"}} disabled={index === table.length - 1} icon={<DownOutlined />} size="small" onClick={() => this.downRow(table, index)} />
              </Tooltip>
              <Tooltip placement="topLeft" title={"Delete"}>
                <Button icon={<DeleteOutlined />} size="small" onClick={() => this.deleteRow(table, index)} />
              </Tooltip>
            </div>
          );
        },
      },
    ];

    return (
      <Table rowKey="index" columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
            <Button style={{marginRight: "5px"}} type="primary" size="small" onClick={() => this.addRow(table)}>{"Add"}</Button>
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

export default ServiceTable;
