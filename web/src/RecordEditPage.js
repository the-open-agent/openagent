// Copyright 2023 The OpenAgent Authors.. All Rights Reserved.
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
import {Button, Col, Input, Row, Select, Space, Switch} from "antd";
import SectionCard from "./components/ui/section-card";
import * as RecordBackend from "./backend/RecordBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import Editor from "./common/Editor";

const {Option} = Select;

class RecordEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      recordOwner: props.match.params.organizationName,
      recordName: props.match.params.recordName,
      record: null,
      blockchainProviders: [],
      mode: props.location.mode !== undefined ? props.location.mode : "edit",
    };
  }

  UNSAFE_componentWillMount() {
    this.getRecord();
    this.getProviders();
  }

  getRecord() {
    RecordBackend.getRecord(this.props.account.owner, this.state.recordName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            record: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getProviders() {
    ProviderBackend.getProviders(this.props.account.owner)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            blockchainProviders: res.data.filter(provider => provider.category === "Blockchain" && provider.state === "Active"),
          });
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  parseRecordField(key, value) {
    if (["count"].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateRecordField(key, value) {
    value = this.parseRecordField(key, value);

    const record = this.state.record;
    record[key] = value;
    this.setState({
      record: record,
    });
  }

  renderRecordField(label, control, span = 8) {
    return (
      <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderRecordSwitch(label, checked, onChange, span = 6) {
    return this.renderRecordField(label, <Switch checked={checked} onChange={onChange} />, span);
  }

  renderRecordActions() {
    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };
    if (this.state.mode === "123") {
      return (
        <Space wrap>
          <Button style={btnStyle} onClick={() => this.props.history.push("/records")}>{i18next.t("general:Exit")}</Button>
        </Space>
      );
    }
    return (
      <Space wrap>
        <Button style={btnStyle} onClick={() => this.submitRecordEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button style={btnStyle} onClick={() => this.submitRecordEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
        {this.state.mode === "add" && <Button style={btnStyle} onClick={() => this.deleteRecord()}>{i18next.t("general:Cancel")}</Button>}
      </Space>
    );
  }

  renderRecord() {
    const record = this.state.record;
    const rowGutter = [16, 8];

    const pageTitle = this.state.mode === "add"
      ? i18next.t("record:New Record")
      : i18next.t("record:View Record");

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{pageTitle}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            {this.renderRecordActions()}
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Organization"), i18next.t("general:Organization - Tooltip")),
              <Input value={record.owner} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={record.name} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Client IP"), i18next.t("general:Client IP - Tooltip")),
              <Input value={record.clientIp} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:User"), i18next.t("general:User - Tooltip")),
              <Input value={record.user} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Method"), i18next.t("general:Method - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={record.method}>
                {[
                  {id: "GET", name: "GET"},
                  {id: "HEAD", name: "HEAD"},
                  {id: "POST", name: "POST"},
                  {id: "PUT", name: "PUT"},
                  {id: "DELETE", name: "DELETE"},
                  {id: "CONNECT", name: "CONNECT"},
                  {id: "OPTIONS", name: "OPTIONS"},
                  {id: "TRACE", name: "TRACE"},
                  {id: "PATCH", name: "PATCH"},
                ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)}
              </Select>,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Request URI"), i18next.t("general:Request URI - Tooltip")),
              <Input value={record.requestUri} />,
              16
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Action"), i18next.t("general:Action - Tooltip")),
              <Input value={record.action} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Language"), i18next.t("general:Language - Tooltip")),
              <Input value={record.language} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Region"), i18next.t("general:Region - Tooltip")),
              <Input value={record.region} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:City"), i18next.t("general:City - Tooltip")),
              <Input value={record.city} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Unit"), i18next.t("general:Unit - Tooltip")),
              <Input value={record.unit} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Section"), i18next.t("general:Section - Tooltip")),
              <Input value={record.section} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Count"), i18next.t("general:Count - Tooltip")),
              <Input value={record.count === 0 ? 1 : record.count} onChange={(e) => this.updateRecordField("count", e.target.value)} />,
              8
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Providers")} desc={i18next.t("general:Providers desc")}>
          <Row gutter={rowGutter}>
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Provider"), i18next.t("general:Provider - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={record.provider} onChange={(value) => this.updateRecordField("provider", value)}>
                {this.state.blockchainProviders.map((provider, index) => (
                  <Option key={index} value={provider.name}>{provider.name}</Option>
                ))}
              </Select>,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Block"), i18next.t("general:Block - Tooltip")),
              <Input value={record.block} />,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Provider 2"), i18next.t("general:Provider - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={record.provider2} onChange={(value) => this.updateRecordField("provider2", value)}>
                {this.state.blockchainProviders.map((provider, index) => (
                  <Option key={index} value={provider.name}>{provider.name}</Option>
                ))}
              </Select>,
              8
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Block 2"), i18next.t("general:Block - Tooltip")),
              <Input value={record.block2} />,
              8
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Content")}>
          <Row gutter={rowGutter}>
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Object"), i18next.t("general:Object - Tooltip")),
              <div style={{height: "300px"}}>
                <Editor
                  value={Setting.formatJsonString(record.object)}
                  lang="js"
                  fillHeight
                  fillWidth
                  dark
                />
              </div>,
              24
            )}
            {this.renderRecordField(
              Setting.getLabel(i18next.t("general:Response"), i18next.t("general:Response - Tooltip")),
              <div style={{height: "300px"}}>
                <Editor
                  value={Setting.formatJsonString(record.response)}
                  lang="js"
                  fillHeight
                  fillWidth
                  dark
                />
              </div>,
              24
            )}
            {this.renderRecordSwitch(
              Setting.getLabel(i18next.t("general:Is triggered"), i18next.t("general:Is triggered - Tooltip")),
              record.isTriggered,
              () => {},
              6
            )}
          </Row>
        </SectionCard>
      </div>
    );
  }

  submitRecordEdit(willExist) {
    const record = Setting.deepCopy(this.state.record);
    RecordBackend.updateRecord(this.state.record.owner, this.state.recordName, record)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              recordName: this.state.record.name,
            });
            if (willExist) {
              this.props.history.push("/records");
            } else {
              this.props.history.push(`/records/${this.state.record.owner}/${encodeURIComponent(this.state.record.id)}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updateRecordField("name", this.state.recordName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  deleteRecord() {
    RecordBackend.deleteRecord(this.state.record)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push("/records");
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.record !== null ? this.renderRecord() : <Loading type="page" tip={i18next.t("general:Loading")} />}
      </div>
    );
  }
}

export default RecordEditPage;
