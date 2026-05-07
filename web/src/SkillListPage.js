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
import {Button, Popconfirm, Table, Tag} from "antd";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as SkillBackend from "./backend/SkillBackend";
import i18next from "i18next";
import {DeleteOutlined, DownloadOutlined} from "@ant-design/icons";
import LoadSkillModal from "./LoadSkillModal";

const SKILL_TYPES = ["writing", "coding", "analysis", "translation", "reasoning", "search", "custom"];

class SkillListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      loadModalVisible: false,
    };
  }

  newSkill() {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `skill_${randomName}`,
      createdTime: moment().format(),
      displayName: "",
      type: "custom",
      description: "",
      homepage: "",
      emoji: "",
      metadata: "",
      content: "",
      skillMd: "",
      references: [],
      state: "Active",
    };
  }

  addSkill() {
    const newSkill = this.newSkill();
    SkillBackend.addSkill(newSkill)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/skills/${newSkill.name}`,
            state: {isNewSkill: true},
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  deleteItem = async(i) => {
    return SkillBackend.deleteSkill(this.state.data[i]);
  };

  deleteSkill(record) {
    SkillBackend.deleteSkill(record)
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

  renderTable(skills) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "200px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text, record) => (
          <span>
            {record.emoji && <span style={{marginRight: 6}}>{record.emoji}</span>}
            <Link to={`/skills/${text}`}>{text}</Link>
          </span>
        ),
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "160px",
        sorter: (a, b) => (a.displayName || "").localeCompare(b.displayName || ""),
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: i18next.t("general:Type"),
        dataIndex: "type",
        key: "type",
        width: "120px",
        filterMultiple: false,
        filters: SKILL_TYPES.map((t) => ({text: t, value: t})),
        onFilter: (value, record) => record.type === value,
        sorter: (a, b) => (a.type || "").localeCompare(b.type || ""),
        render: (text) => <Tag color="blue">{text}</Tag>,
      },
      {
        title: i18next.t("general:Description"),
        dataIndex: "description",
        key: "description",
        ellipsis: true,
        ...this.getColumnSearchProps("description"),
      },
      {
        title: i18next.t("skill:References"),
        key: "references",
        width: "160px",
        render: (_, record) => {
          const refs = record.references || [];
          if (refs.length === 0) {
            return null;
          }
          return (
            <div style={{display: "flex", flexDirection: "column", gap: "3px"}}>
              {refs.map(r => (
                <Tag key={r.name} style={{fontFamily: "monospace", margin: 0}}>{r.name}</Tag>
              ))}
            </div>
          );
        },
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "100px",
        sorter: (a, b) => (a.state || "").localeCompare(b.state || ""),
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "220px",
        fixed: "right",
        render: (text, record) => (
          <div>
            <Button
              style={{marginTop: "10px", marginBottom: "10px", marginRight: "10px"}}
              type="primary"
              onClick={() => this.props.history.push(`/skills/${record.name}`)}
            >
              {i18next.t("general:Edit")}
            </Button>
            <Popconfirm
              title={`${i18next.t("general:Sure to delete")}: ${record.name}?`}
              onConfirm={() => this.deleteSkill(record)}
              okText={i18next.t("general:OK")}
              cancelText={i18next.t("general:Cancel")}
            >
              <Button style={{marginBottom: "10px"}} type="primary" danger icon={<DeleteOutlined />}>
                {i18next.t("general:Delete")}
              </Button>
            </Popconfirm>
          </div>
        ),
      },
    ];

    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100"],
      showTotal: (total) => i18next.t("general:{total} in total").replace("{total}", total),
    };

    return (
      <div>
        <LoadSkillModal
          open={this.state.loadModalVisible}
          onClose={() => this.setState({loadModalVisible: false})}
          onImported={(skillName) => this.props.history.push(`/skills/${skillName}`)}
        />
        <Table
          scroll={{x: "max-content"}}
          columns={columns}
          dataSource={skills}
          rowKey="name"
          size="middle"
          bordered
          pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Skills")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={() => this.addSkill()}>
                {i18next.t("general:Add")}
              </Button>
              &nbsp;&nbsp;
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => this.setState({loadModalVisible: true})}
              >
                {i18next.t("skill:Load Existing Skill")}
              </Button>
            </div>
          )}
          loading={this.state.loading}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params = {}) => {
    const {pagination} = params;
    this.setState({loading: true});
    SkillBackend.getSkills("admin", pagination.current, pagination.pageSize, this.state.searchField, this.state.searchValue, params.sortField, params.sortOrder)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            loading: false,
            data: res.data,
            pagination: {
              ...pagination,
              total: res.data2,
            },
          });
        } else {
          if (res.status === "error" && res.msg === "Unauthorized") {
            this.setState({isAuthorized: false, loading: false});
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          }
        }
      });
  };
}

export default SkillListPage;
