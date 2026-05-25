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
import {Alert, Button, Popconfirm, Table, Tooltip} from "antd";
import {DeleteOutlined, EditOutlined} from "@ant-design/icons";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as SkillBackend from "./backend/SkillBackend";
import * as WebsiteKnowledgeBackend from "./backend/WebsiteKnowledgeBackend";
import i18next from "i18next";

function parsePlaybook(skill) {
  try {
    return JSON.parse(skill.metadata || "{}");
  } catch (_) {
    return {};
  }
}

class WebsiteKnowledgeListPage extends BaseListPage {
  deleteWebsiteKnowledge(record) {
    SkillBackend.deleteSkill(record).then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully deleted"));
        this.setState({data: this.state.data.filter(item => item.name !== record.name), pagination: {...this.state.pagination, total: this.state.pagination.total - 1}});
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
      }
    }).catch(error => Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${error}`));
  }

  renderTable(skills) {
    const columns = [
      {title: i18next.t("general:Name"), dataIndex: "name", key: "name", width: "240px", sorter: (a, b) => a.name.localeCompare(b.name), ...this.getColumnSearchProps("name"), render: text => <Link to={`/website-knowledges/${text}`}>{text}</Link>},
      {title: i18next.t("general:Display name"), dataIndex: "displayName", key: "displayName", width: "180px", sorter: (a, b) => (a.displayName || "").localeCompare(b.displayName || ""), ...this.getColumnSearchProps("displayName")},
      {title: i18next.t("websiteKnowledge:Site"), key: "siteId", width: "180px", render: (_, record) => parsePlaybook(record).siteId || ""},
      {title: i18next.t("websiteKnowledge:Element count"), key: "elementCount", width: "120px", render: (_, record) => Object.keys(parsePlaybook(record).elements || {}).length},
      {title: i18next.t("websiteKnowledge:Page count"), key: "pageCount", width: "110px", render: (_, record) => Object.keys(parsePlaybook(record).pages || {}).length},
      {title: i18next.t("websiteKnowledge:Updated at"), key: "updatedAt", width: "220px", render: (_, record) => {const pb = parsePlaybook(record); return pb.updatedAt || pb.source?.learnedAt || "";}},
      {title: i18next.t("general:Action"), key: "action", width: "120px", fixed: "right", render: (_, record) => (
        <div style={{display: "flex", gap: "2px"}}>
          <Tooltip title={i18next.t("general:Edit")}><Button type="text" size="small" icon={<EditOutlined />} onClick={() => this.props.history.push(`/website-knowledges/${record.name}`)} /></Tooltip>
          <Popconfirm title={`${i18next.t("general:Sure to delete")}: ${record.name}?`} onConfirm={() => this.deleteWebsiteKnowledge(record)} okText={i18next.t("general:OK")} cancelText={i18next.t("general:Cancel")}>
            <Tooltip title={i18next.t("general:Delete")}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </div>
      )},
    ];
    return (
      <div>
        <Alert type="info" showIcon style={{marginBottom: 12}} message={i18next.t("websiteKnowledge:Website memory must be learned from chat")} />
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={skills} rowKey="name" size="middle" bordered pagination={{total: this.state.pagination.total, showQuickJumper: true, showSizeChanger: true, showTotal: total => i18next.t("general:{total} in total").replace("{total}", total)}} title={() => i18next.t("websiteKnowledge:Website memories")} loading={this.state.loading} onChange={this.handleTableChange} />
      </div>
    );
  }

  fetch = (params = {}) => {
    const pagination = params.pagination || this.state.pagination;
    this.setState({loading: true});
    WebsiteKnowledgeBackend.getWebsiteKnowledges().then((res) => {
      if (res.status === "ok") {
        this.setState({loading: false, data: res.data || [], pagination: {...pagination, total: (res.data || []).length}});
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        this.setState({loading: false});
      }
    });
  };
}

export default WebsiteKnowledgeListPage;
