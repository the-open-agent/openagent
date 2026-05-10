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
import Loading from "./common/Loading";
import {Button, Col, Input, Row, Select, Space} from "antd";
import SectionCard from "./components/ui/section-card";
import {LinkOutlined} from "@ant-design/icons";
import * as FormBackend from "./backend/FormBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import FormItemTable from "./table/FormItemTable";
import RecordListPage from "./RecordListPage";
import StoreListPage from "./StoreListPage";
import VectorListPage from "./VectorListPage";
import TaskListPage from "./TaskListPage";

const {Option} = Select;
const formTypeOptions = Setting.getFormTypeOptions();

class FormEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      formName: props.match.params.formName,
      isNewForm: props.location?.state?.isNewForm || false,
      form: null,
      formCount: "key",
    };
  }

  UNSAFE_componentWillMount() {
    this.getForm();
  }

  getForm() {
    FormBackend.getForm(this.props.account.owner, this.state.formName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            form: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  parseFormField(key, value) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateFormField(key, value) {
    value = this.parseFormField(key, value);

    const form = this.state.form;
    form[key] = value;
    this.setState({
      form: form,
    });
  }

  renderFormField(label, control, span = 8) {
    return (
      <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderFormActions() {
    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };
    return (
      <Space wrap>
        <Button style={btnStyle} onClick={() => this.submitFormEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button style={btnStyle} onClick={() => this.submitFormEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
        {this.state.isNewForm && <Button style={btnStyle} onClick={() => this.cancelFormEdit()}>{i18next.t("general:Cancel")}</Button>}
      </Space>
    );
  }

  renderListPagePreview() {
    let listPageComponent = null;

    if (this.state.form.type === "records") {
      listPageComponent = (<RecordListPage {...this.props} formItems={this.state.form.formItems} />);
    } else if (this.state.form.type === "stores") {
      listPageComponent = (<StoreListPage {...this.props} formItems={this.state.form.formItems} />);
    } else if (this.state.form.type === "vectors") {
      listPageComponent = (<VectorListPage {...this.props} formItems={this.state.form.formItems} />);
    } else if (this.state.form.type === "tasks") {
      listPageComponent = (<TaskListPage {...this.props} formItems={this.state.form.formItems} />);
    }

    return (
      <div style={{position: "relative", border: "1px solid rgb(217,217,217)", height: "600px", cursor: "pointer"}} onClick={() => {Setting.openLink(`/${this.state.form.type}`);}}>
        <div style={{position: "relative", height: "100%", overflow: "auto"}}>
          <div style={{display: "inline-block", position: "relative", zIndex: 1, pointerEvents: "none"}}>
            {listPageComponent}
          </div>
        </div>
        <div style={{position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: "rgba(0,0,0,0.4)", pointerEvents: "none"}} />
      </div>
    );
  }

  renderFormConfigContent() {
    const form = this.state.form;
    if (form.category === "Table") {
      return (
        <Row gutter={[16, 8]}>
          {this.renderFormField(
            Setting.getLabel(i18next.t("form:Form items"), i18next.t("form:Form items - Tooltip")),
            <FormItemTable
              title={i18next.t("form:Form items")}
              table={form.formItems}
              category={form.category}
              onUpdateTable={(value) => this.updateFormField("formItems", value)}
            />,
            24
          )}
        </Row>
      );
    }
    if (form.category === "iFrame") {
      return (
        <Row gutter={[16, 8]}>
          {this.renderFormField(
            Setting.getLabel(i18next.t("general:URL"), i18next.t("general:URL - Tooltip")),
            <Input prefix={<LinkOutlined />} value={form.url} onChange={(e) => this.updateFormField("url", e.target.value)} />,
            24
          )}
        </Row>
      );
    }
    if (form.category === "List Page") {
      return (
        <Row gutter={[16, 8]}>
          {this.renderFormField(
            Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip")),
            <Select
              style={{width: "100%"}}
              value={form.type}
              onChange={(value) => {
                this.updateFormField("type", value);
                this.updateFormField("name", value);
                this.updateFormField("displayName", value);
                const defaultItems = new FormItemTable({formType: value}).getItems();
                this.updateFormField("formItems", defaultItems);
              }}
            >
              {formTypeOptions.map(option => (
                <Option key={option.id} value={option.id}>{i18next.t(option.name)}</Option>
              ))}
            </Select>,
            8
          )}
          {this.renderFormField(
            Setting.getLabel(i18next.t("general:Tag"), i18next.t("general:Tag - Tooltip")),
            <Input value={form.tag} onChange={(e) => {
              this.updateFormField("tag", e.target.value);
              this.updateFormField("name", e.target.value ? `${form.type}-tag-${e.target.value}` : form.type);
            }} />,
            8
          )}
          {this.renderFormField(
            Setting.getLabel(i18next.t("form:Form items"), i18next.t("form:Form items - Tooltip")),
            <FormItemTable
              title={i18next.t("form:Form items")}
              table={form.formItems}
              category={form.category}
              onUpdateTable={(value) => this.updateFormField("formItems", value)}
              formType={form.type}
            />,
            24
          )}
        </Row>
      );
    }
    return null;
  }

  renderForm() {
    const form = this.state.form;
    const rowGutter = [16, 8];
    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("form:Edit Form")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            {this.renderFormActions()}
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderFormField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={form.name} onChange={(e) => this.updateFormField("name", e.target.value)} />,
              8
            )}
            {this.renderFormField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={form.displayName} onChange={(e) => this.updateFormField("displayName", e.target.value)} />,
              8
            )}
            {this.renderFormField(
              Setting.getLabel(i18next.t("form:Position"), i18next.t("form:Position - Tooltip")),
              <Input value={form.position} onChange={(e) => this.updateFormField("position", e.target.value)} />,
              8
            )}
            {this.renderFormField(
              Setting.getLabel(i18next.t("general:Category"), i18next.t("provider:Category - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={form.category} onChange={(value) => this.updateFormField("category", value)}>
                {[
                  {id: "Table", name: i18next.t("form:Table")},
                  {id: "iFrame", name: i18next.t("form:iFrame")},
                  {id: "List Page", name: i18next.t("form:List Page")},
                ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)}
              </Select>,
              8
            )}
          </Row>
        </SectionCard>

        {form.category && (
          <SectionCard title={i18next.t("general:Content")}>
            {this.renderFormConfigContent()}
          </SectionCard>
        )}

        <SectionCard title={i18next.t("general:Preview")}>
          <Row gutter={rowGutter}>
            {this.renderFormField(
              "",
              form.category === "List Page" ? this.renderListPagePreview() : (
                <div key={this.state.formCount}>
                  <iframe id="formData" title={"formData"} src={`${location.href}/data`} width="100%" height="700px" frameBorder="no" style={{border: "1px solid #e0e0e0", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"}} />
                </div>
              ),
              24
            )}
          </Row>
        </SectionCard>
      </div>
    );
  }

  submitFormEdit(exitAfterSave) {
    const form = Setting.deepCopy(this.state.form);
    if (!exitAfterSave) {
      this.setState({
        formCount: this.state.formCount + "a",
      });
    }
    FormBackend.updateForm(this.state.form.owner, this.state.formName, form)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              formName: this.state.form.name,
              isNewForm: false,
            });
            if (exitAfterSave) {
              this.props.history.push("/forms");
            } else {
              this.props.history.push(`/forms/${this.state.form.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to save"));
            this.updateFormField("name", this.state.formName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelFormEdit() {
    if (this.state.isNewForm) {
      FormBackend.deleteForm(this.state.form)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/forms");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/forms");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.form !== null ? this.renderForm() : <Loading type="page" tip={i18next.t("general:Loading")} />}
      </div>
    );
  }
}

export default FormEditPage;
