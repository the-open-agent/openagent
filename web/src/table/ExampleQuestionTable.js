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

import {AppTooltip} from "../components/ui/tooltip";
import {Button, Input, Table} from "antd";
import {DeleteOutlined, DownOutlined, UpOutlined} from "@ant-design/icons";
import i18next from "i18next";
import React from "react";
import * as Setting from "../Setting";

class ExampleQuestionTable extends React.Component {
  constructor(props) {
    super(props);
  }

  updateTable(table) {
    this.props.onUpdateTable(table);
  }

  updateField(table, index, key, value) {
    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table) {
    const row = {
      title: "Example Question",
      text: "What can you help me with?",
      image: "",
    };
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

  render() {
    if (!this.props.table) {
      this.props.onUpdateTable([]);
    }

    const columns = [
      {
        title: i18next.t("general:Title"),
        dataIndex: "title",
        key: "title",
        width: "30%",
        render: (text, record, index) => (
          <Input value={text} onChange={e => this.updateField(this.props.table, index, "title", e.target.value)} />
        ),
      },
      {
        title: i18next.t("general:Text"),
        dataIndex: "text",
        key: "text",
        width: "30%",
        render: (text, record, index) => (
          <Input value={text} onChange={e => this.updateField(this.props.table, index, "text", e.target.value)} />
        ),
      },
      {
        title: i18next.t("general:Icon"),
        dataIndex: "image",
        key: "image",
        width: "30%",
        render: (text, record, index) => (
          <Input
            value={text}
            onChange={e => this.updateField(this.props.table, index, "image", e.target.value)}
            placeholder={i18next.t("general:Icon URL (optional)")}
          />
        ),
      },
      {
        title: i18next.t("general:Action"),
        key: "action",
        width: "100px",
        render: (text, record, index) => {
          return (
            <div>
              <AppTooltip placement="bottomLeft" title={i18next.t("general:Up")}>
                <Button
                  style={{marginRight: "5px"}}
                  disabled={index === 0}
                  icon={<UpOutlined />}
                  size="small"
                  onClick={() => this.upRow(this.props.table, index)}
                />
              </AppTooltip>
              <AppTooltip placement="topLeft" title={i18next.t("general:Down")}>
                <Button
                  style={{marginRight: "5px"}}
                  disabled={index === this.props.table.length - 1}
                  icon={<DownOutlined />}
                  size="small"
                  onClick={() => this.downRow(this.props.table, index)}
                />
              </AppTooltip>
              <AppTooltip placement="right" title={i18next.t("general:Delete")}>
                <Button
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => this.deleteRow(this.props.table, index)}
                />
              </AppTooltip>
            </div>
          );
        },
      },
    ];

    return (
      <div style={{marginTop: "20px"}}>
        <Table
          rowKey="index"
          columns={columns}
          dataSource={this.props.table}
          size="middle"
          bordered
          pagination={false}
          title={() => (
            <div>
              {i18next.t("store:Example questions")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button
                style={{marginRight: "5px"}}
                type="primary"
                size="small"
                onClick={() => this.addRow(this.props.table)}
              >
                {i18next.t("general:Add")}
              </Button>
            </div>
          )}
        />
      </div>
    );
  }
}

export default ExampleQuestionTable;
