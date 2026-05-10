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
import * as ChatBackend from "./backend/ChatBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import ChatBox from "./ChatBox";
import {renderText} from "./ChatMessageRender";
import * as MessageBackend from "./backend/MessageBackend";

const {Option} = Select;

class ChatEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      chatName: props.match.params.chatName,
      chat: null,
      messages: null,
      provider: null,
      providers: [],
      isNewChat: props.location?.state?.isNewChat || false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getChat();
    this.getMessages(this.state.chatName);
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

  getChat() {
    ChatBackend.getChat("admin", this.state.chatName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            chat: res.data,
          });
          this.getProvider(res.data.modelProvider);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getMessages(chatName) {
    MessageBackend.getChatMessages("admin", chatName)
      .then((res) => {
        res.data.map((message) => {
          message.html = renderText(message.text);
        });
        this.setState({
          messages: res.data,
        });
      });
  }

  parseChatField(key, value) {
    if ([""].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateChatField(key, value) {
    value = this.parseChatField(key, value);

    const chat = this.state.chat;
    chat[key] = value;
    this.setState({
      chat: chat,
    });
  }

  renderChatActions() {
    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };

    return (
      <Space wrap>
        <Button style={btnStyle} onClick={() => this.submitChatEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button style={btnStyle} onClick={() => this.submitChatEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
        {this.state.isNewChat && <Button style={btnStyle} onClick={() => this.cancelChatEdit()}>{i18next.t("general:Cancel")}</Button>}
      </Space>
    );
  }

  renderChatField(label, control, span = 8, style = {}) {
    return (
      <Col style={{marginTop: "12px", ...style}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderChatSwitch(label, checked, onChange, span = 6) {
    return this.renderChatField(label, <Switch checked={checked} onChange={onChange} />, span);
  }

  renderChat() {
    const chat = this.state.chat;
    const rowGutter = [16, 8];
    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("chat:Edit Chat")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            {this.renderChatActions()}
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderChatField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={chat.name} onChange={e => {
                this.updateChatField("name", e.target.value);
              }} />,
              8
            )}
            {this.renderChatField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={chat.displayName} onChange={e => {
                this.updateChatField("displayName", e.target.value);
              }} />,
              8
            )}
            {this.renderChatField(
              Setting.getLabel(i18next.t("general:Store"), i18next.t("general:Store - Tooltip")),
              <Input value={chat.store} onChange={e => {
                this.updateChatField("store", e.target.value);
              }} />,
              8
            )}
            {this.renderChatField(
              Setting.getLabel(i18next.t("provider:Model provider"), i18next.t("provider:Model provider - Tooltip")),
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={chat.modelProvider}
                onChange={(value) => {
                  this.updateChatField("modelProvider", value);
                  this.getProvider(value);
                }}
                showSearch
                filterOption={(input, option) =>
                  option.children[1].toLowerCase().includes(input.toLowerCase())
                }
              >
                {
                  this.state.providers.map((provider, index) => (
                    <Option key={index} value={provider.name}>
                      <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}} src={Setting.getProviderLogoURL({category: provider.category, type: provider.type})} alt={provider.type} />
                      {provider.name}
                    </Option>
                  ))
                }
              </Select>,
              8
            )}
            {this.renderChatField(
              Setting.getLabel(i18next.t("general:Category"), i18next.t("provider:Category - Tooltip")),
              <Input value={chat.category} onChange={e => {
                this.updateChatField("category", e.target.value);
              }} />,
              8
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Users")} desc={i18next.t("general:Users desc")}>
          <Row gutter={rowGutter}>
            {this.renderChatField(
              Setting.getLabel(i18next.t("general:User"), i18next.t("general:User - Tooltip")),
              <Input value={chat.user} onChange={e => {
                this.updateChatField("user", e.target.value);
              }} />,
              8
            )}
            {this.renderChatSwitch(
              Setting.getLabel(i18next.t("general:Is deleted"), i18next.t("general:Is deleted - Tooltip")),
              chat.isDeleted,
              checked => {
                this.updateChatField("isDeleted", checked);
              },
              6
            )}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Messages")} desc={i18next.t("general:Messages desc")}>
          <div style={{width: "100%", height: "800px"}}>
            <ChatBox disableInput={true} hideInput={true} messages={this.state.messages} sendMessage={null} account={this.props.account} />
          </div>
        </SectionCard>
      </div>
    );
  }

  submitChatEdit(exitAfterSave) {
    const chat = Setting.deepCopy(this.state.chat);
    ChatBackend.updateChat(this.state.chat.owner, this.state.chatName, chat)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              chatName: this.state.chat.name,
              isNewChat: false,
            });

            if (exitAfterSave) {
              this.props.history.push("/chats");
            } else {
              this.props.history.push(`/chats/${this.state.chat.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updateChatField("name", this.state.chatName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelChatEdit() {
    if (this.state.isNewChat) {
      ChatBackend.deleteChat(this.state.chat)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/chats");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/chats");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {
          this.state.chat !== null ? this.renderChat() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
      </div>
    );
  }
}

export default ChatEditPage;
