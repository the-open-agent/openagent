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
import {Table} from "antd";
import {Switch} from "../components/ui/switch";
import i18next from "i18next";

class ToolTable extends React.Component {
  updateTable(table) {
    this.props.onUpdateTable(table);
  }

  updateToolAllowed(table, index, value) {
    const newTable = [...(table || [])];
    newTable[index] = {...newTable[index], isAllowed: value};
    this.updateTable(newTable);
  }

  renderTable(table) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "260px",
      },
      {
        title: i18next.t("general:Description"),
        dataIndex: "description",
        key: "description",
      },
      {
        title: i18next.t("server:Is allowed"),
        dataIndex: "isAllowed",
        key: "isAllowed",
        width: "120px",
        render: (text, record, index) => (
          <Switch checked={record.isAllowed} onCheckedChange={(checked) => this.updateToolAllowed(table, index, checked)} />
        ),
      },
    ];

    return (
      <Table
        rowKey={(record, index) => record.name || `tool-${index}`}
        columns={columns}
        dataSource={table || []}
        size="middle"
        bordered
        pagination={false}
      />
    );
  }

  render() {
    return this.renderTable(this.props.tools || []);
  }
}

export default ToolTable;
