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
import {Alert, Button, Card, Col, Collapse, Form, Input, Row, Select, Space, Table, Tag, Typography} from "antd";
import Loading from "./common/Loading";
import * as Setting from "./Setting";
import * as WebsiteKnowledgeBackend from "./backend/WebsiteKnowledgeBackend";
import i18next from "i18next";

const cardProps = {size: "small", style: {marginBottom: 16, borderRadius: 14}, headStyle: {borderBottom: "none", fontWeight: 600}};

function formatPosition(position) {
  if (!position) {
    return "-";
  }
  const viewport = `viewport (${Math.round(position.x)}, ${Math.round(position.y)}, ${Math.round(position.width || 0)}, ${Math.round(position.height || 0)})`;
  return position.documentX || position.documentY ? `doc (${Math.round(position.documentX)}, ${Math.round(position.documentY)}) · ${viewport}` : viewport;
}

class WebsiteKnowledgeEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {skillName: props.match.params.skillName, skill: null, playbook: null, consolidateLoading: false};
  }

  UNSAFE_componentWillMount() {
    WebsiteKnowledgeBackend.getWebsiteKnowledge(`admin/${this.state.skillName}`).then((res) => {
      if (res.status === "ok") {
        this.setState({skill: res.data.skill, playbook: res.data.playbook || {}});
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
      }
    });
  }

  updateSkillField(key, value) {
    this.setState({skill: {...this.state.skill, [key]: value}});
  }

  submitWebsiteKnowledge(exitAfterSave) {
    const {skill, playbook} = this.state;
    WebsiteKnowledgeBackend.updateWebsiteKnowledge(`${skill.owner}/${this.state.skillName}`, {displayName: skill.displayName, homepage: skill.homepage, state: skill.state, playbook}).then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully saved"));
        let nextPlaybook = playbook;
        try {
          nextPlaybook = JSON.parse(res.data.metadata || "{}");
        } catch (_) {
          nextPlaybook = playbook;
        }
        this.setState({skill: res.data, playbook: nextPlaybook});
        if (exitAfterSave) {
          this.props.history.push("/website-knowledges");
        }
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    }).catch(error => Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`));
  }

  consolidateMemory = () => {
    this.setState({consolidateLoading: true});
    WebsiteKnowledgeBackend.consolidateMemory(`admin/${this.state.skillName}`).then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("websiteKnowledge:Consolidate memory success"));
        let nextPlaybook = this.state.playbook;
        try {
          nextPlaybook = JSON.parse(res.data.skill.metadata || "{}");
        } catch (_) {
          // keep current playbook
        }
        this.setState({skill: res.data.skill, playbook: nextPlaybook});
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    }).finally(() => this.setState({consolidateLoading: false}));
  };

  renderField(label, control, span = 8) {
    return <Col span={span}><Form.Item label={label} style={{marginBottom: 8}}>{control}</Form.Item></Col>;
  }

  renderWebsiteKnowledge() {
    const {skill, playbook} = this.state;
    const elementRows = Object.values(playbook.elements || {}).map(item => ({...item, key: item.name}));
    const pageRows = Object.values(playbook.pages || {}).map(item => ({...item, key: item.name}));
    return (
      <div>
        <div style={{marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: 22, fontWeight: 600}}>{i18next.t("websiteKnowledge:Edit website memory")}</span>
          <Space wrap>
            <Button loading={this.state.consolidateLoading} onClick={this.consolidateMemory}>{i18next.t("websiteKnowledge:Consolidate memory")}</Button>
            <Button onClick={() => this.submitWebsiteKnowledge(false)}>{i18next.t("general:Save")}</Button>
            <Button onClick={() => this.submitWebsiteKnowledge(true)}>{i18next.t("general:Save & Exit")}</Button>
          </Space>
        </div>
        {playbook.source?.learnedAt && <Alert type="info" showIcon style={{marginBottom: 12}} message={`${i18next.t("websiteKnowledge:Last merged from")}: ${playbook.source.messageOwner}/${playbook.source.messageName} @ ${playbook.source.learnedAt}`} />}
        <Card {...cardProps} title={i18next.t("general:General Settings")}>
          <Row gutter={[16, 8]}>
            {this.renderField(i18next.t("general:Name"), <Input value={skill.name} readOnly />)}
            {this.renderField(i18next.t("general:Display name"), <Input value={skill.displayName} onChange={e => this.updateSkillField("displayName", e.target.value)} />)}
            {this.renderField(i18next.t("skill:Homepage"), <Input value={skill.homepage} onChange={e => this.updateSkillField("homepage", e.target.value)} />)}
            {this.renderField(i18next.t("general:State"), <Select value={skill.state} style={{width: "100%"}} onChange={value => this.updateSkillField("state", value)} options={[{value: "Active", label: i18next.t("general:Active")}, {value: "Inactive", label: i18next.t("general:Inactive")}]} />)}
            {this.renderField(i18next.t("websiteKnowledge:Site"), <Input value={playbook.siteId || ""} readOnly />)}
            {this.renderField(i18next.t("websiteKnowledge:Element count"), <Input value={String(Object.keys(playbook.elements || {}).length)} readOnly />)}
            {this.renderField(i18next.t("websiteKnowledge:Page count"), <Input value={String(Object.keys(playbook.pages || {}).length)} readOnly />)}
            {this.renderField(i18next.t("websiteKnowledge:Memory updated at"), <Input value={playbook.updatedAt || "-"} readOnly />)}
          </Row>
        </Card>
        <Card {...cardProps} title={i18next.t("websiteKnowledge:Observed elements")}>
          <Table columns={[
            {title: i18next.t("general:Name"), dataIndex: "name", width: 220},
            {title: i18next.t("general:Tag"), dataIndex: "label", width: 100, render: (text, record) => text || record.tag || "-"},
            {title: i18next.t("websiteKnowledge:Element role"), dataIndex: "role", width: 90},
            {title: i18next.t("websiteKnowledge:Page"), dataIndex: "page", width: 140},
            {title: i18next.t("general:Label"), dataIndex: "label", width: 140, render: (text, record) => text || record.text || "-"},
            {title: i18next.t("websiteKnowledge:Position"), dataIndex: "position", width: 180, render: formatPosition},
            {title: i18next.t("websiteKnowledge:Param variable"), dataIndex: "paramVar", width: 140, render: (text, record) => text ? <Tag>{record.paramHint ? `${text}=${record.paramHint}` : text}</Tag> : "-"},
            {title: i18next.t("websiteKnowledge:Selectors"), dataIndex: "selectors", render: selectors => (selectors || []).slice(0, 2).map(selector => <Tag key={selector}>{selector}</Tag>)},
          ]} dataSource={elementRows} pagination={false} bordered size="small" scroll={{x: "max-content"}} />
        </Card>
        <Card {...cardProps} title={i18next.t("websiteKnowledge:Learned pages")}>
          <Table columns={[
            {title: i18next.t("general:Name"), dataIndex: "name", width: 180},
            {title: i18next.t("general:Description"), dataIndex: "description"},
            {title: i18next.t("websiteKnowledge:URL patterns"), dataIndex: "urlPatterns", render: patterns => (patterns || []).map(pattern => <Tag key={pattern}>{pattern}</Tag>)},
            {title: i18next.t("websiteKnowledge:Observed URLs"), dataIndex: "observedUrls", render: urls => (urls || []).slice(0, 3).map(url => <Tag key={url}>{url}</Tag>)},
          ]} dataSource={pageRows} pagination={false} bordered size="small" scroll={{x: "max-content"}} />
        </Card>
        <Card {...cardProps} title={i18next.t("websiteKnowledge:SKILL preview")}>
          <Collapse size="small" ghost items={[{key: "skill", label: <Typography.Text type="secondary">{i18next.t("skill:SKILL.md view")}</Typography.Text>, children: <pre style={{background: "#f5f5f5", padding: 12, borderRadius: 6, fontSize: 12, maxHeight: 360, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0}}>{skill.skillMd}</pre>}]} />
        </Card>
      </div>
    );
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.skill !== null && this.state.playbook !== null ? this.renderWebsiteKnowledge() : <Loading type="page" tip={i18next.t("general:Loading")} />}
      </div>
    );
  }
}

export default WebsiteKnowledgeEditPage;
