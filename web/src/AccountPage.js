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
import {Avatar, Button, Col, Form, Input, Modal, Row, Space, message} from "antd";
import SectionCard from "./components/ui/section-card";
import i18next from "i18next";
import * as AccountBackend from "./backend/AccountBackend";
import * as Setting from "./Setting";

class AccountPage extends React.Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
    this.state = {
      avatar: props.account?.avatar ?? "",
      passwordModalVisible: false,
      currentPassword: "",
      newPassword: "",
    };
  }

  onFinish(values) {
    AccountBackend.updateAccount(values)
      .then((res) => {
        if (res.status === "ok") {
          message.success(i18next.t("general:Successfully saved"));
          window.location.reload();
        } else {
          message.error(res.msg);
        }
      })
      .catch((error) => message.error(error.message));
  }

  closePasswordModal() {
    this.setState({
      passwordModalVisible: false,
      currentPassword: "",
      newPassword: "",
    });
  }

  setPassword() {
    const values = this.formRef.current.getFieldsValue();
    AccountBackend.updateAccount({...values, currentPassword: this.state.currentPassword, newPassword: this.state.newPassword})
      .then((res) => {
        if (res.status === "ok") {
          message.success(i18next.t("general:Successfully saved"));
          this.closePasswordModal();
        } else {
          message.error(res.msg);
        }
      })
      .catch((error) => message.error(error.message));
  }

  renderAvatar() {
    const account = this.props.account;
    const avatarUrl = this.state.avatar || "";
    const hasAvatarUrl = avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("data:image/");

    if (!hasAvatarUrl) {
      return (
        <Avatar style={{backgroundColor: Setting.getAvatarColor(account.name)}} size={64}>
          {Setting.getShortName(account.name)}
        </Avatar>
      );
    }

    return (
      <Avatar src={avatarUrl} size={64}>
        {Setting.getShortName(account.name)}
      </Avatar>
    );
  }

  renderField(label, control, span = 12) {
    return (
      <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderModalField(label, control) {
    return (
      <div style={{marginBottom: "20px"}}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </div>
    );
  }

  render() {
    const account = this.props.account;

    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };

    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("account:My Account")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            <Space wrap>
              <Button style={btnStyle} onClick={() => this.formRef.current.submit()}>{i18next.t("general:Save")}</Button>
            </Space>
          </div>
        </div>

        <Form
          ref={this.formRef}
          initialValues={{
            username: account.name,
            displayName: account.displayName,
            avatar: account.avatar,
          }}
          onFinish={(values) => this.onFinish(values)}
          onValuesChange={(_, values) => this.setState({avatar: values.avatar ?? ""})}
        >
          <SectionCard title={i18next.t("account:Profile")} desc={i18next.t("account:Profile desc")}>
            <Row gutter={[16, 8]}>
              {this.renderField(
                Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
                <Form.Item name="username" style={{margin: 0}}>
                  <Input disabled placeholder={i18next.t("account:Account ID")} />
                </Form.Item>,
                12
              )}
              {this.renderField(
                Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
                <Form.Item name="displayName" style={{margin: 0}}>
                  <Input placeholder={i18next.t("account:Name shown in OpenAgent")} />
                </Form.Item>,
                12
              )}
              {this.renderField(
                Setting.getLabel(i18next.t("general:Avatar"), i18next.t("general:Avatar - Tooltip")),
                <Row gutter={10} align="middle">
                  <Col flex="80px">
                    {this.renderAvatar()}
                  </Col>
                  <Col flex="auto">
                    <Form.Item name="avatar" style={{margin: 0}}>
                      <Input placeholder={i18next.t("account:Avatar image URL, optional")} />
                    </Form.Item>
                  </Col>
                </Row>,
                24
              )}
            </Row>
          </SectionCard>

          <SectionCard title={i18next.t("general:Password")} desc={i18next.t("account:Password desc")}>
            <Row gutter={[16, 8]}>
              {this.renderField(
                Setting.getLabel(i18next.t("general:Password"), i18next.t("general:Password - Tooltip")),
                <Button style={btnStyle} onClick={() => this.setState({passwordModalVisible: true})}>
                  {i18next.t("account:Modify password...")}
                </Button>,
                12
              )}
            </Row>
          </SectionCard>
        </Form>

        <Modal
          maskClosable={false}
          title={i18next.t("account:Modify password")}
          open={this.state.passwordModalVisible}
          okText={i18next.t("account:Set Password")}
          cancelText={i18next.t("general:Cancel")}
          onCancel={() => this.closePasswordModal()}
          onOk={() => this.setPassword()}
          width={520}
        >
          <div style={{padding: "16px 0 8px"}}>
            {this.renderModalField(
              i18next.t("account:Old Password"),
              <Input.Password
                placeholder={i18next.t("account:Enter current password")}
                value={this.state.currentPassword}
                onChange={e => this.setState({currentPassword: e.target.value})}
              />
            )}
            {this.renderModalField(
              i18next.t("account:New password"),
              <Input.Password
                placeholder={i18next.t("account:Enter new password")}
                value={this.state.newPassword}
                onChange={e => this.setState({newPassword: e.target.value})}
              />
            )}
          </div>
        </Modal>
      </div>
    );
  }
}

export default AccountPage;
