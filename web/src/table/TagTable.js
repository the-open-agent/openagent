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

import {AppTooltip} from "../components/ui/tooltip";
import React from "react";
import {Button, Col, Input, Row, Select, Table} from "antd";
import {DeleteOutlined, RedoOutlined} from "@ant-design/icons";
import * as Setting from "../Setting";
import i18next from "i18next";
import * as MessageBackend from "../backend/MessageBackend";

class TagTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      selectedRowKeys: [],
    };
  }

  updateTable(table) {
    this.props.onUpdateTable(table);
  }

  parseField(key, value) {
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

  updateVideoField(key, value) {
    this.props.onUpdateVideoField(key, value);
  }

  getQuestion(task, example) {
    return `${task.scale.replace("{example}", example).replace("{labels}", task.labels.map(label => `"${label}"`).join(", "))}`;
  }

  trimAnswer(s) {
    let res = Setting.trim(s, "[");
    res = Setting.trim(res, "]");
    res = Setting.trim(res, "\"");
    return res;
  }

  getAnswer(task, text, rowIndex, columnIndex) {
    const provider = task.provider;
    const question = this.getQuestion(task, text);
    const framework = task.name;
    const video = this.props.video.name;
    MessageBackend.getAnswer(provider, question, framework, video)
      .then((res) => {
        if (res.status === "ok") {
          this.updateField(this.props.table, rowIndex, `tag${columnIndex + 1}`, this.trimAnswer(res.data));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  runTask(columnIndex) {
    const task = this.props.tasks[columnIndex];
    this.props.table.forEach((row, rowIndex) => {
      if (!this.state.selectedRowKeys.includes(`${rowIndex}`)) {
        return;
      }

      this.getAnswer(task, row.text, rowIndex, columnIndex);
    });
  }

  clearTask(columnIndex) {
    this.props.table.forEach((row, rowIndex) => {
      if (!this.state.selectedRowKeys.includes(`${rowIndex}`)) {
        return;
      }

      this.updateField(this.props.table, rowIndex, `tag${columnIndex + 1}`, "");
    });
  }

  renderTableHeader(columnIndex) {
    const taskFieldName = `task${columnIndex + 1}`;
    return (
      <React.Fragment>
        <Select virtual={false} size={"small"} style={{width: "160px"}} value={this.props.video[taskFieldName]} onChange={(value => {this.updateVideoField(taskFieldName, value);})}
          options={this.props.tasks.map((task) => Setting.getOption(task.displayName, task.name))
          } />
        &nbsp;&nbsp;
        <AppTooltip placement="right" title={"Run"}>
          <Button disabled={this.props.video[taskFieldName] === "" || this.state.selectedRowKeys.length === 0} icon={<RedoOutlined />} size="small" onClick={() => this.runTask(columnIndex)} />
        </AppTooltip>
        &nbsp;&nbsp;
        <AppTooltip placement="right" title={"Clear"}>
          <Button icon={<DeleteOutlined />} size="small" onClick={() => {
            this.clearTask(columnIndex);
            this.updateVideoField(taskFieldName, "");
          }} />
        </AppTooltip>
      </React.Fragment>
    );
  }

  renderTable(table) {
    const columns = [
      {
        title: i18next.t("general:No."),
        dataIndex: "no",
        key: "no",
        width: "50px",
        render: (text, record, index) => {
          return (
            <Button type={"text"} style={{width: "50px"}} onClick={() => {
              this.props.player.seek(record.startTime);
              this.props.screen.clear();
              this.props.videoObj.clearMaps();
            }} >
              {index + 1}
            </Button>
          );
        },
      },
      {
        title: i18next.t("video:Time"),
        dataIndex: "startTime",
        key: "startTime",
        width: "100px",
        render: (text, record, index) => {
          return Setting.getTimeFromSeconds(text);
        },
      },
      {
        title: i18next.t("video:Role"),
        dataIndex: "speaker",
        key: "speaker",
        width: "50px",
        render: (text, record, index) => {
          return Setting.getSpeakerTag(text);
        },
      },
      {
        title: i18next.t("general:Text"),
        dataIndex: "text",
        key: "text",
        // width: "200px",
      },
      {
        title: this.renderTableHeader(0),
        dataIndex: "tag1",
        key: "tag1",
        width: "250px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "tag1", e.target.value);
            }} />
          );
        },
      },
      {
        title: this.renderTableHeader(1),
        dataIndex: "tag2",
        key: "tag2",
        width: "250px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "tag2", e.target.value);
            }} />
          );
        },
      },
      {
        title: this.renderTableHeader(2),
        dataIndex: "tag3",
        key: "tag3",
        width: "250px",
        render: (text, record, index) => {
          return (
            <Input value={text} onChange={e => {
              this.updateField(table, index, "tag3", e.target.value);
            }} />
          );
        },
      },
    ];

    const rowSelection = {
      onChange: (newSelectedRowKeys) => {
        this.setState({
          selectedRowKeys: newSelectedRowKeys,
        });
      },
      selections: [
        Table.SELECTION_ALL,
        Table.SELECTION_INVERT,
        Table.SELECTION_NONE,
      ],
    };

    return (
      <Table rowKey={"id"} rowSelection={rowSelection} columns={columns} dataSource={table} size="middle" bordered pagination={false}
        title={() => (
          <div>
            {this.props.title}&nbsp;&nbsp;&nbsp;&nbsp;
          </div>
        )}
      />
    );
  }

  render() {
    return (
      <div>
        <Row style={{marginTop: "10px"}} >
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

export default TagTable;
