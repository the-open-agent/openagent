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
import Loading from "./common/Loading";
import {Button, Col, Collapse, Input, Row, Select, Space, Tag, Typography} from "antd";
import SectionCard from "./components/ui/section-card";
import * as SkillBackend from "./backend/SkillBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import Editor from "./common/Editor";

const {Option} = Select;
const {TextArea} = Input;
const {Panel} = Collapse;
const {Text} = Typography;

const SKILL_TYPES = ["writing", "coding", "analysis", "translation", "reasoning", "search", "custom"];

class SkillEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      skillName: props.match.params.skillName,
      skill: null,
      originalSkill: null,
      isNewSkill: props.location?.state?.isNewSkill || false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getSkill();
  }

  getSkill() {
    SkillBackend.getSkill("admin", this.state.skillName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            skill: res.data,
            originalSkill: Setting.deepCopy(res.data),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  updateSkillField(key, value) {
    const skill = this.state.skill;
    skill[key] = value;
    this.setState({skill});
  }

  renderSkillField(label, control, span = 8, style = {}) {
    return (
      <Col style={{marginTop: "12px", ...style}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderSkillSwitch(label, checked, onChange, span = 6) {
    const {Switch} = require("antd");
    return this.renderSkillField(label, <Switch checked={checked} onChange={onChange} />, span);
  }

  renderSkill() {
    const {skill} = this.state;
    const rowGutter = [16, 8];

    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("skill:Edit Skill")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            <Space wrap>
              <Button style={btnStyle} onClick={() => this.submitSkillEdit(false)}>{i18next.t("general:Save")}</Button>
              <Button style={btnStyle} onClick={() => this.submitSkillEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
              {this.state.isNewSkill && <Button style={btnStyle} onClick={() => this.cancelSkillEdit()}>{i18next.t("general:Cancel")}</Button>}
            </Space>
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderSkillField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={skill.name} onChange={e => this.updateSkillField("name", e.target.value)} />,
              8
            )}
            {this.renderSkillField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={skill.displayName} onChange={e => this.updateSkillField("displayName", e.target.value)} />,
              8
            )}
            {this.renderSkillField(
              Setting.getLabel(i18next.t("skill:Emoji"), i18next.t("skill:Emoji - Tooltip")),
              <Input
                value={skill.emoji}
                onChange={e => this.updateSkillField("emoji", e.target.value)}
                style={{maxWidth: 120}}
                placeholder="🚀"
              />,
              4
            )}
            {this.renderSkillField(
              Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={skill.type}
                onChange={(value) => this.updateSkillField("type", value)}
              >
                {SKILL_TYPES.map((t, index) => (
                  <Option key={index} value={t}>{t}</Option>
                ))}
              </Select>,
              8
            )}
            {this.renderSkillField(
              Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={skill.state}
                onChange={value => this.updateSkillField("state", value)}
                options={[
                  {value: "Active", label: i18next.t("general:Active")},
                  {value: "Inactive", label: i18next.t("general:Inactive")},
                ].map(item => Setting.getOption(item.label, item.value))}
              />,
              8
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Content")} desc={i18next.t("general:Content desc")}>
          <Row gutter={rowGutter}>
            {this.renderSkillField(
              Setting.getLabel(i18next.t("general:Description"), i18next.t("general:Description - Tooltip")),
              <TextArea
                rows={3}
                value={skill.description}
                onChange={e => this.updateSkillField("description", e.target.value)}
              />,
              24
            )}
            {this.renderSkillField(
              Setting.getLabel(i18next.t("skill:Homepage"), i18next.t("skill:Homepage - Tooltip")),
              <Input
                value={skill.homepage}
                onChange={e => this.updateSkillField("homepage", e.target.value)}
                placeholder="https://..."
              />,
              12
            )}
            {this.renderSkillField(
              Setting.getLabel(i18next.t("general:Content"), i18next.t("skill:Content - Tooltip")),
              <Editor
                lang="markdown"
                value={skill.content}
                onChange={value => this.updateSkillField("content", value)}
                fillWidth
                height="400px"
                dark
                lineWrapping
              />,
              24
            )}
            {skill.references && skill.references.length > 0 && (
              this.renderSkillField(
                Setting.getLabel(i18next.t("skill:References"), i18next.t("skill:References - Tooltip")),
                <Collapse size="small" ghost>
                  {skill.references.map((ref, idx) => (
                    <Panel
                      key={idx}
                      header={
                        <span>
                          <Tag style={{fontFamily: "monospace"}}>{ref.name}</Tag>
                          <Text type="secondary" style={{fontSize: 12}}>
                            {ref.content ? `${ref.content.length} chars` : "empty"}
                          </Text>
                        </span>
                      }
                    >
                      <TextArea
                        rows={8}
                        value={ref.content}
                        onChange={e => {
                          const refs = Setting.deepCopy(skill.references);
                          refs[idx].content = e.target.value;
                          this.updateSkillField("references", refs);
                        }}
                        style={{fontFamily: "monospace", fontSize: 12}}
                      />
                    </Panel>
                  ))}
                </Collapse>,
                24
              )
            )}
            {skill.skillMd && (
              this.renderSkillField(
                Setting.getLabel(i18next.t("skill:SKILL.md"), i18next.t("skill:SKILL.md - Tooltip")),
                <Collapse size="small" ghost>
                  <Panel header={<Text type="secondary">{i18next.t("skill:SKILL.md view")}</Text>}>
                    <pre style={{
                      background: "#f5f5f5",
                      padding: "12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      maxHeight: "320px",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      margin: 0,
                    }}>
                      {skill.skillMd}
                    </pre>
                  </Panel>
                </Collapse>,
                24
              )
            )}
          </Row>
        </SectionCard>
      </div>
    );
  }

  submitSkillEdit(exitAfterSave) {
    const skill = Setting.deepCopy(this.state.skill);
    SkillBackend.updateSkill(this.state.skill.owner, this.state.skillName, skill)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              skillName: this.state.skill.name,
              isNewSkill: false,
            });

            if (exitAfterSave) {
              this.props.history.push("/skills");
            } else {
              this.props.history.push(`/skills/${this.state.skill.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updateSkillField("name", this.state.skillName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelSkillEdit() {
    if (this.state.isNewSkill) {
      SkillBackend.deleteSkill(this.state.skill)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/skills");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/skills");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {
          this.state.skill !== null ? this.renderSkill() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
      </div>
    );
  }
}

export default SkillEditPage;
