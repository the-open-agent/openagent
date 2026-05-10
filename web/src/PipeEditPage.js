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
import {Button, Col, Input, Row, Select, Switch} from "antd";
import SectionCard from "./components/ui/section-card";
import {LinkOutlined, SendOutlined} from "@ant-design/icons";
import * as PipeBackend from "./backend/PipeBackend";
import * as StoreBackend from "./backend/StoreBackend";
import * as Setting from "./Setting";
import i18next from "i18next";

const {Option} = Select;

class PipeEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      pipeName: props.match.params.pipeName,
      pipe: null,
      originalPipe: null,
      storeNames: [],
      isNewPipe: props.location?.state?.isNewPipe || false,
      testChatId: "",
      testMessage: "",
      testResult: "",
      isTesting: false,
      isSendingWebhook: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getStoreNames();
    this.getPipe();
  }

  getStoreNames() {
    StoreBackend.getStoreNames("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({storeNames: res.data || []});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      })
      .catch((error) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
      });
  }

  getStoreOptions() {
    return this.state.storeNames.map((store) => {
      const label = store.displayName ? `${store.displayName} (${store.name})` : store.name;
      return Setting.getOption(label, store.name);
    });
  }

  getPipe() {
    PipeBackend.getPipe("admin", this.state.pipeName)
      .then((res) => {
        if (res.status === "ok") {
          const pipe = res.data;
          if (!pipe.store) {
            pipe.store = "store-built-in";
          }
          this.setState({
            pipe: pipe,
            originalPipe: Setting.deepCopy(pipe),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  updatePipeField(key, value) {
    const pipe = this.state.pipe;
    pipe[key] = value;
    this.setState({pipe});
  }

  setPipeWebhook() {
    this.setState({isSendingWebhook: true});
    const id = `${this.state.pipe.owner}/${this.state.pipe.name}`;
    PipeBackend.setPipeWebhook(id)
      .then((res) => {
        this.setState({isSendingWebhook: false});
        if (res.status === "ok") {
          Setting.showMessage("success", `${i18next.t("provider:Webhook set successfully")}: ${res.data}`);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch((error) => {
        this.setState({isSendingWebhook: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  chatTest() {
    const {pipe} = this.state;
    if (!pipe.chatId) {
      Setting.showMessage("error", "Please enter a Chat ID");
      return;
    }
    if (!pipe.chatTestMessage) {
      Setting.showMessage("error", "Please enter a test message");
      return;
    }
    this.setState({isTesting: true, testResult: ""});
    const id = `${pipe.owner}/${pipe.name}`;
    PipeBackend.chatTest(id, pipe.chatId, pipe.chatTestMessage)
      .then((res) => {
        this.setState({isTesting: false});
        if (res.status === "ok") {
          this.setState({testResult: i18next.t("general:Success")});
          Setting.showMessage("success", i18next.t("general:Success"));
        } else {
          this.setState({testResult: res.msg});
          Setting.showMessage("error", res.msg);
        }
      })
      .catch((error) => {
        this.setState({isTesting: false, testResult: String(error)});
        Setting.showMessage("error", String(error));
      });
  }

  submitPipeEdit(exitAfterSave) {
    const pipe = Setting.deepCopy(this.state.pipe);
    PipeBackend.updatePipe(this.state.pipe.owner, this.state.pipeName, pipe)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              pipeName: this.state.pipe.name,
              isNewPipe: false,
            });
            if (exitAfterSave) {
              this.props.history.push("/pipes");
            } else {
              this.props.history.push(`/pipes/${this.state.pipe.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updatePipeField("name", this.state.pipeName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  cancelPipeEdit() {
    if (this.state.isNewPipe) {
      PipeBackend.deletePipe(this.state.pipe)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/pipes");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/pipes");
    }
  }

  getSecretKeyLabel(pipeType) {
    if (pipeType === "WhatsApp") {
      return Setting.getLabel(i18next.t("pipe:Phone Number ID"), i18next.t("pipe:Phone Number ID - Tooltip"));
    } else if (pipeType === "Slack") {
      return Setting.getLabel(i18next.t("pipe:Signing Secret"), i18next.t("pipe:Signing Secret - Tooltip"));
    } else if (pipeType === "Facebook Messenger") {
      return Setting.getLabel(i18next.t("pipe:App Secret"), i18next.t("pipe:App Secret - Tooltip"));
    } else if (pipeType === "Threads") {
      return Setting.getLabel(i18next.t("pipe:App Secret"), i18next.t("pipe:Threads App Secret - Tooltip"));
    } else if (pipeType === "WeChat") {
      return Setting.getLabel(i18next.t("pipe:App Secret"), i18next.t("pipe:WeChat App Secret - Tooltip"));
    } else if (pipeType === "Snapchat") {
      return Setting.getLabel(i18next.t("pipe:App Secret"), i18next.t("pipe:Snapchat App Secret - Tooltip"));
    } else if (pipeType === "X Direct Messages") {
      return Setting.getLabel(i18next.t("pipe:Consumer Secret"), i18next.t("pipe:X Direct Messages Consumer Secret - Tooltip"));
    } else {
      return Setting.getLabel(i18next.t("provider:Public key"), i18next.t("provider:Public key - Tooltip"));
    }
  }

  renderPipe() {
    const pipe = this.state.pipe;

    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>
            {i18next.t("pipe:Edit Pipe")}
          </span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            <Button style={btnStyle} onClick={() => this.submitPipeEdit(false)}>{i18next.t("general:Save")}</Button>
            <Button style={btnStyle} onClick={() => this.submitPipeEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
            {this.state.isNewPipe && <Button style={btnStyle} onClick={() => this.cancelPipeEdit()}>{i18next.t("general:Cancel")}</Button>}
          </div>
        </div>

        {/* Card 1: General Settings */}
        <SectionCard title={i18next.t("general:General Settings")}>
          <Row style={{marginTop: "10px"}} gutter={16}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 11}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:ID"), i18next.t("general:Name - Tooltip"))}</div>
              <Input value={pipe.name} onChange={e => this.updatePipeField("name", e.target.value)} />
            </Col>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 11}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))}</div>
              <Input value={pipe.displayName} onChange={e => this.updatePipeField("displayName", e.target.value)} />
            </Col>
          </Row>

          <Row style={{marginTop: "20px"}} gutter={16}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 7}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip"))}</div>
              <Select virtual={false} style={{width: "100%"}} value={pipe.type}
                onChange={(value) => this.updatePipeField("type", value)}
              >
                {[
                  {id: "Telegram", name: "Telegram"},
                  {id: "Discord", name: "Discord"},
                  {id: "WhatsApp", name: "WhatsApp"},
                  {id: "Slack", name: "Slack"},
                  {id: "Facebook Messenger", name: "Facebook Messenger"},
                  {id: "Threads", name: "Threads"},
                  {id: "WeChat", name: "WeChat"},
                  {id: "Snapchat", name: "Snapchat"},
                  {id: "X Direct Messages", name: "X Direct Messages"},
                ].map((item, index) => (
                  <Option key={index} value={item.id}>
                    <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}}
                      src={Setting.getProviderLogoURL({category: "Chat", type: item.name})}
                      alt={item.name} />
                    {item.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 11}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:Store"), i18next.t("general:Store - Tooltip"))}</div>
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={pipe.store || "store-built-in"}
                onChange={(value) => this.updatePipeField("store", value)}
                options={this.getStoreOptions()}
              />
            </Col>
          </Row>

          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
              {Setting.getLabel(i18next.t("general:Token"), i18next.t("general:Token - Tooltip"))}
            </Col>
            <Col span={22}>
              <Input.Password value={pipe.token} onChange={e => this.updatePipeField("token", e.target.value)} />
            </Col>
          </Row>

          {(pipe.type === "Discord" || pipe.type === "WhatsApp" || pipe.type === "Slack" || pipe.type === "Facebook Messenger" || pipe.type === "Threads" || pipe.type === "WeChat" || pipe.type === "Snapchat" || pipe.type === "X Direct Messages") && (
            <Row style={{marginTop: "20px"}}>
              <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
                {this.getSecretKeyLabel(pipe.type)}
              </Col>
              <Col span={22}>
                <Input.Password
                  value={pipe.secretKey}
                  disabled={!Setting.isAdminUser(this.props.account)}
                  onChange={e => this.updatePipeField("secretKey", e.target.value)}
                />
              </Col>
            </Row>
          )}

          {pipe.type === "WhatsApp" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={22} offset={Setting.isMobile() ? 0 : 2}>
                <span style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                  {i18next.t("pipe:WhatsApp verify token hint")}&nbsp;<strong>{pipe.name}</strong>
                </span>
              </Col>
            </Row>
          )}

          {pipe.type === "Slack" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={22} offset={Setting.isMobile() ? 0 : 2}>
                <span style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                  {i18next.t("pipe:Slack webhook hint")}&nbsp;
                  <strong>{pipe.domain ? `${pipe.domain}/api/chat-webhook/slack/${pipe.name}` : `https://<your-domain>/api/chat-webhook/slack/${pipe.name}`}</strong>
                </span>
              </Col>
            </Row>
          )}

          {pipe.type === "Facebook Messenger" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={22} offset={Setting.isMobile() ? 0 : 2}>
                <span style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                  {i18next.t("pipe:Facebook Messenger verify token hint")}&nbsp;<strong>{pipe.name}</strong>
                  <br />
                  {i18next.t("pipe:Facebook Messenger webhook hint")}&nbsp;
                  <strong>{pipe.domain ? `${pipe.domain}/api/chat-webhook/facebook-messenger/${pipe.name}` : `https://<your-domain>/api/chat-webhook/facebook-messenger/${pipe.name}`}</strong>
                </span>
              </Col>
            </Row>
          )}

          {pipe.type === "Threads" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={22} offset={Setting.isMobile() ? 0 : 2}>
                <span style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                  {i18next.t("pipe:Threads token hint")}
                  <br />
                  {i18next.t("pipe:Threads verify token hint")}&nbsp;<strong>{pipe.name}</strong>
                  <br />
                  {i18next.t("pipe:Threads webhook hint")}&nbsp;
                  <strong>{pipe.domain ? `${pipe.domain}/api/chat-webhook/threads/${pipe.name}` : `https://<your-domain>/api/chat-webhook/threads/${pipe.name}`}</strong>
                </span>
              </Col>
            </Row>
          )}

          {pipe.type === "WeChat" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={22} offset={Setting.isMobile() ? 0 : 2}>
                <span style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                  {i18next.t("pipe:WeChat token hint")}
                  <br />
                  {i18next.t("pipe:WeChat verify token hint")}&nbsp;<strong>{pipe.name}</strong>
                  <br />
                  {i18next.t("pipe:WeChat webhook hint")}&nbsp;
                  <strong>{pipe.domain ? `${pipe.domain}/api/chat-webhook/wechat/${pipe.name}` : `https://<your-domain>/api/chat-webhook/wechat/${pipe.name}`}</strong>
                </span>
              </Col>
            </Row>
          )}

          {pipe.type === "Snapchat" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={22} offset={Setting.isMobile() ? 0 : 2}>
                <span style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                  {i18next.t("pipe:Snapchat token hint")}
                  <br />
                  {i18next.t("pipe:Snapchat webhook hint")}&nbsp;
                  <strong>{pipe.domain ? `${pipe.domain}/api/chat-webhook/snapchat/${pipe.name}` : `https://<your-domain>/api/chat-webhook/snapchat/${pipe.name}`}</strong>
                </span>
              </Col>
            </Row>
          )}

          {pipe.type === "X Direct Messages" && (
            <Row style={{marginTop: "20px"}}>
              <Col span={22} offset={Setting.isMobile() ? 0 : 2}>
                <span style={{color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                  {i18next.t("pipe:X Direct Messages token hint")}
                  <br />
                  {i18next.t("pipe:X Direct Messages webhook hint")}&nbsp;
                  <strong>{pipe.domain ? `${pipe.domain}/api/chat-webhook/x-dm/${pipe.name}` : `https://<your-domain>/api/chat-webhook/x-dm/${pipe.name}`}</strong>
                </span>
              </Col>
            </Row>
          )}

          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
              {Setting.getLabel(i18next.t("provider:Domain"), i18next.t("provider:Domain - Tooltip"))}
            </Col>
            <Col span={22}>
              <Input prefix={<LinkOutlined />} value={pipe.domain} onChange={e => this.updatePipeField("domain", e.target.value)} />
            </Col>
          </Row>

          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
              {Setting.getLabel(i18next.t("store:Is default"), i18next.t("store:Is default - Tooltip"))}
            </Col>
            <Col span={1}>
              <Switch checked={pipe.isDefault} onChange={checked => this.updatePipeField("isDefault", checked)} />
            </Col>
          </Row>

          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 2}>
              {Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip"))}
            </Col>
            <Col span={22}>
              <Select virtual={false} style={{width: "100%"}} value={pipe.state}
                onChange={value => this.updatePipeField("state", value)}
                options={[
                  {value: "Active", label: i18next.t("general:Active")},
                  {value: "Inactive", label: i18next.t("general:Inactive")},
                ].map(item => Setting.getOption(item.label, item.value))}
              />
            </Col>
          </Row>
        </SectionCard>

        {/* Card 2: Pipe Test */}
        <SectionCard title={i18next.t("pipe:Pipe Test")}>
          <Row style={{marginTop: "10px"}}>
            <Col span={24}>
              <Button
                type="primary"
                loading={this.state.isSendingWebhook}
                onClick={() => this.setPipeWebhook()}
              >
                {i18next.t("provider:Set Webhook")}
              </Button>
              <span style={{marginLeft: "12px", color: "var(--ant-color-text-secondary)", fontSize: "13px"}}>
                {i18next.t("provider:Webhook - Tooltip")}
              </span>
            </Col>
          </Row>
        </SectionCard>

        {/* Card 3: Chat Test */}
        <SectionCard title={i18next.t("pipe:Chat Test")}>
          <Row style={{marginTop: "10px"}} gutter={16}>
            <Col span={Setting.isMobile() ? 22 : 8}>
              <div style={{marginBottom: "4px"}}>{i18next.t("pipe:Chat ID")}</div>
              <Input
                placeholder={i18next.t("pipe:Chat ID placeholder")}
                value={pipe.chatId}
                onChange={e => this.updatePipeField("chatId", e.target.value)}
              />
            </Col>
            <Col span={Setting.isMobile() ? 22 : 12}>
              <div style={{marginBottom: "4px"}}>{i18next.t("pipe:Test message")}</div>
              <Input
                placeholder={i18next.t("pipe:Test message placeholder")}
                value={pipe.chatTestMessage}
                onChange={e => this.updatePipeField("chatTestMessage", e.target.value)}
                onPressEnter={() => this.chatTest()}
              />
            </Col>
            <Col span={4} style={{display: "flex", alignItems: "flex-end"}}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={this.state.isTesting}
                onClick={() => this.chatTest()}
              >
                {i18next.t("pipe:Send")}
              </Button>
            </Col>
          </Row>
          {this.state.testResult && (
            <Row style={{marginTop: "12px"}}>
              <Col span={24}>
                <Input.TextArea
                  readOnly
                  autoSize={{minRows: 2, maxRows: 6}}
                  value={this.state.testResult}
                />
              </Col>
            </Row>
          )}
        </SectionCard>
      </div>
    );
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.pipe !== null ? this.renderPipe() : <Loading type="page" tip={i18next.t("general:Loading")} />}
      </div>
    );
  }
}

export default PipeEditPage;
