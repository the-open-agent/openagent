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

import React from "react";
import Loading from "./common/Loading";
import {Button, Col, Input, Row, Select, Space, Switch} from "antd";
import SectionCard from "./components/ui/section-card";
import i18next from "i18next";
import * as Setting from "./Setting";
import * as MessageBackend from "./backend/MessageBackend";
import * as ChatBackend from "./backend/ChatBackend";
import * as ProviderBackend from "./backend/ProviderBackend";

const {TextArea} = Input;
const {Option} = Select;

class MessageEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      messageName: props.match.params.messageName,
      isNewMessage: props.location?.state?.isNewMessage || false,
      messages: [],
      message: null,
      chats: [],
      chat: null,
      provider: null,
      providers: [],
    };
  }

  UNSAFE_componentWillMount() {
    this.getMessage();
    this.getMessages();
    this.getChats();
    this.getProviders();
  }

  getProviders() {
    ProviderBackend.getProviders("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            providers: res.data.filter(p => p.category === "Model"),
          });
        }
      });
  }

  getProvider(providerName) {
    if (!providerName) {
      return;
    }
    ProviderBackend.getProvider("admin", providerName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            provider: res.data,
          });
        }
      });
  }

  getChats() {
    ChatBackend.getChats(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            chats: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getChat(chatName) {
    ChatBackend.getChat("admin", chatName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            chat: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getMessage() {
    MessageBackend.getMessage("admin", this.state.messageName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            message: res.data,
          });
          this.getProvider(res.data.modelProvider);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getMessages() {
    MessageBackend.getMessages(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            messages: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  parseMessageField(key, value) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateMessageField(key, value) {
    value = this.parseMessageField(key, value);

    const message = this.state.message;
    message[key] = value;
    this.setState({
      message: message,
    });
  }

  renderMessageField(label, control, span = 8) {
    return (
      <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderMessageSwitch(label, checked, onChange, span = 6) {
    return this.renderMessageField(label, <Switch checked={checked} onChange={onChange} />, span);
  }

  renderMessageActions() {
    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };
    return (
      <Space wrap>
        <Button style={btnStyle} onClick={() => this.submitMessageEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button style={btnStyle} onClick={() => this.submitMessageEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
        {this.state.isNewMessage && <Button style={btnStyle} onClick={() => this.cancelMessageEdit()}>{i18next.t("general:Cancel")}</Button>}
      </Space>
    );
  }

  renderMessage() {
    const message = this.state.message;
    const rowGutter = [16, 8];

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("message:Edit Message")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            {this.renderMessageActions()}
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderMessageField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={message.name} onChange={(e) => this.updateMessageField("name", e.target.value)} />,
              8
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("general:User"), i18next.t("general:User - Tooltip")),
              <Input value={message.user} onChange={(e) => this.updateMessageField("user", e.target.value)} />,
              8
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("general:Chat"), i18next.t("general:Chat - Tooltip")),
              <Button onClick={() => this.props.history.push(`/chats/${message.chat}`)}>{message.chat}</Button>,
              8
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("message:Author"), i18next.t("message:Author - Tooltip")),
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={message.author}
                onChange={(value) => this.updateMessageField("author", value)}
                options={
                  this.state.chat !== null
                    ? this.state.chat.users.map((user) => Setting.getOption(`${user}`, `${user}`))
                    : []
                }
              />,
              8
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("provider:Model provider"), i18next.t("provider:Model provider - Tooltip")),
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={message.modelProvider}
                onChange={(value) => {
                  this.updateMessageField("modelProvider", value);
                  this.getProvider(value);
                }}
                showSearch
                filterOption={(input, option) =>
                  option.children[1].toLowerCase().includes(input.toLowerCase())
                }
              >
                {this.state.providers.map((provider, index) => (
                  <Option key={index} value={provider.name}>
                    <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}} src={Setting.getProviderLogoURL({category: provider.category, type: provider.type})} alt={provider.type} />
                    {provider.name}
                  </Option>
                ))}
              </Select>,
              12
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("message:Reply to"), i18next.t("message:Reply to - Tooltip")),
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={message.replyTo}
                onChange={(value) => this.updateMessageField("replyTo", value)}
                options={
                  this.state.messages !== null
                    ? this.state.messages.map((msg) => Setting.getOption(`${msg.name}`, `${msg.name}`))
                    : []
                }
              />,
              12
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Content")}>
          <Row gutter={rowGutter}>
            {this.renderMessageField(
              Setting.getLabel(i18next.t("general:Reasoning text"), i18next.t("general:Reasoning text - Tooltip")),
              <TextArea autoSize={{minRows: 1, maxRows: 15}} value={message.reasonText} onChange={(e) => this.updateMessageField("reasonText", e.target.value)} />,
              24
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("general:Text"), i18next.t("general:Text - Tooltip")),
              <TextArea autoSize={{minRows: 1, maxRows: 15}} value={message.text} onChange={(e) => this.updateMessageField("text", e.target.value)} />,
              24
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("message:Error text"), i18next.t("message:Error text - Tooltip")),
              <TextArea autoSize={{minRows: 1, maxRows: 15}} value={message.errorText} onChange={(e) => this.updateMessageField("errorText", e.target.value)} />,
              24
            )}
            {this.renderMessageField(
              Setting.getLabel(i18next.t("message:Comment"), i18next.t("message:Comment - Tooltip")),
              <TextArea autoSize={{minRows: 1, maxRows: 15}} value={message.comment} onChange={(e) => {
                if (e.target.value !== "") {
                  this.updateMessageField("needNotify", true);
                } else {
                  this.updateMessageField("needNotify", false);
                }
                this.updateMessageField("comment", e.target.value);
              }} />,
              24
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Options")}>
          <Row gutter={rowGutter}>
            {this.renderMessageSwitch(
              Setting.getLabel(i18next.t("message:Need notify"), i18next.t("message:Need notify - Tooltip")),
              message.needNotify,
              (checked) => this.updateMessageField("needNotify", checked),
              6
            )}
            {this.renderMessageSwitch(
              Setting.getLabel(i18next.t("general:Is deleted"), i18next.t("general:Is deleted - Tooltip")),
              message.isDeleted,
              (checked) => this.updateMessageField("isDeleted", checked),
              6
            )}
            {this.renderMessageSwitch(
              Setting.getLabel(i18next.t("general:Is alerted"), i18next.t("general:Is alerted - Tooltip")),
              message.isAlerted,
              (checked) => this.updateMessageField("isAlerted", checked),
              6
            )}
          </Row>
        </SectionCard>
      </div>
    );
  }

  submitMessageEdit(exitAfterSave) {
    const message = Setting.deepCopy(this.state.message);
    MessageBackend.updateMessage(this.state.message.owner, this.state.messageName, message)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              messageName: this.state.message.name,
              isNewMessage: false,
            });
            if (exitAfterSave) {
              this.props.history.push("/messages");
            } else {
              this.props.history.push(`/messages/${this.state.message.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updateMessageField("name", this.state.messageName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch((error) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelMessageEdit() {
    if (this.state.isNewMessage) {
      MessageBackend.deleteMessage(this.state.message)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/messages");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/messages");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.message !== null ? this.renderMessage() : <Loading type="page" tip={i18next.t("general:Loading")} />}
      </div>
    );
  }
}

export default MessageEditPage;
