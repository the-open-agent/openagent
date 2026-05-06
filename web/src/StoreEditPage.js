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
import {Avatar, Button, Card, Cascader, Col, Input, InputNumber, Modal, Row, Select, Space, Spin, Switch} from "antd";
import * as StoreBackend from "./backend/StoreBackend";
import * as StorageProviderBackend from "./backend/StorageProviderBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as ServerBackend from "./backend/ServerBackend";
import * as ToolBackend from "./backend/ToolBackend";
import * as SkillBackend from "./backend/SkillBackend";
import * as OrganizationUserBackend from "./backend/OrganizationUserBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import FileTree from "./FileTree";
import ExampleQuestionTable from "./table/ExampleQuestionTable";
import StoreAvatarUploader from "./AvatarUpload";

const {Option} = Select;
const {TextArea} = Input;

class StoreEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      owner: props.match.params.owner,
      storeName: props.match.params.storeName,
      stores: [],
      casdoorStorageProviders: [],
      storageProviders: [],
      vectorStoreId: "",
      storageSubpath: "",
      modelProviders: [],
      embeddingProviders: [],
      textToSpeechProviders: [],
      speechToTextProviders: [],
      mcpServers: [],
      skills: [],
      tools: [],
      builtinTools: [],
      enableTtsStreaming: false,
      store: null,
      isNewStore: props.location?.state?.isNewStore || false,
      ownerUsers: [],
      ownerUsersLoading: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getStore();
    this.getStores();
    this.getStorageProviders();
    this.getProviders();
    this.getMcpServers();
    this.getSkills();
    this.getTools();
  }

  loadOwnerUsers() {
    if (this.state.ownerUsers.length > 0) {
      return;
    }
    this.setState({ownerUsersLoading: true});
    OrganizationUserBackend.getOrganizationUsers()
      .then((res) => {
        if (res.status === "ok") {
          this.setState({ownerUsers: res.data || []});
        } else {
          Setting.showMessage("error", res.msg || i18next.t("general:Failed to load"));
        }
      })
      .catch((err) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to load")}: ${err}`);
      })
      .finally(() => this.setState({ownerUsersLoading: false}));
  }

  renderProviderOption(provider, index) {
    return (
      <Option key={index} value={provider.name}>
        <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}}
          src={Setting.getProviderLogoURL({category: provider.category, type: provider.type})}
          alt={provider.name} />
        {Setting.getProviderDisplayName(provider)} ({provider.name})
      </Option>
    );
  }

  renderToolOption(tool, index) {
    return (
      <Option key={index} value={tool.name}>
        <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}}
          src={Setting.getProviderLogoURL({category: "Tool", type: tool.type})}
          alt={tool.name} />
        {tool.name}
      </Option>
    );
  }

  getStore() {
    StoreBackend.getStore(this.state.owner, this.state.storeName)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data && typeof res.data2 === "string" && res.data2 !== "") {
            res.data.error = res.data2;
          }

          const store = res.data;
          this.setState({
            store: store,
            ...(store ? {owner: store.owner, storeName: store.name} : {}),
          });
          if (store && store.owner && store.owner !== this.props.match.params.owner) {
            this.props.history.replace(`/stores/${store.owner}/${store.name}`);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getStores() {
    StoreBackend.getStores(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            stores: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getStorageProviders() {
    StorageProviderBackend.getStorageProviders(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            casdoorStorageProviders: res.data,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getProviders() {
    ProviderBackend.getProviders(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            storageProviders: res.data.filter(provider => provider.category === "Storage"),
            modelProviders: res.data.filter(provider => provider.category === "Model"),
            embeddingProviders: res.data.filter(provider => provider.category === "Embedding"),
            textToSpeechProviders: res.data.filter(provider => provider.category === "Text-to-Speech"),
            speechToTextProviders: res.data.filter(provider => provider.category === "Speech-to-Text"),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getMcpServers() {
    ServerBackend.getServers(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({mcpServers: res.data});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getSkills() {
    SkillBackend.getSkills(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({skills: res.data});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getTools() {
    ToolBackend.getTools(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({tools: res.data});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  parseStoreField(key, value) {
    if (["score"].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  renderBuiltinTools() {
    const builtinToolsConfig = Setting.getBuiltinTools();
    const selectedTools = this.state.store.builtinTools || [];

    const options = builtinToolsConfig.map(category => ({
      value: category.category,
      label: `${category.icon} ${category.name}`,
      children: category.tools.map(tool => ({
        value: tool.name,
        label: (
          <div>
            <div style={{fontWeight: 500, color: "#1890ff"}}>{tool.name}</div>
            <div style={{fontSize: "12px", color: "#8c8c8c"}}>{tool.description}</div>
          </div>
        ),
      })),
    }));

    const value = selectedTools.map(tool => {
      const category = builtinToolsConfig.find(cat =>
        cat.tools.some(t => t.name === tool)
      );
      return category ? [category.category, tool] : null;
    }).filter(v => v);

    return (
      <Cascader
        multiple
        maxTagCount="responsive"
        style={{width: "100%"}}
        placeholder={i18next.t("store:Select builtin tools")}
        options={options}
        value={value}
        onChange={(values) => {
          this.updateStoreField("builtinTools", values.map(v => v[1]));
        }}
        showCheckedStrategy="SHOW_CHILD"
        popupClassName="builtin-tools-cascader"
      />
    );
  }

  updateStoreField(key, value) {
    value = this.parseStoreField(key, value);

    this.setState(prevState => {
      if (!prevState.store) {
        return null;
      }
      return {
        store: {
          ...prevState.store,
          [key]: value,
        },
      };
    });
  }

  isAIStorageProvider(storageProvider) {
    const providerSelected = this.state.storageProviders.concat(this.state.casdoorStorageProviders).find(v => v.name === storageProvider);
    if (providerSelected && providerSelected.type === "OpenAI File System") {
      return true;
    }
    return false;
  }

  renderStoreActions(size, useGlobalAdminCheck = false) {
    if (this.state.store === null) {
      return null;
    }

    const shouldShowClaim = this.state.store.owner === "admin" &&
      Setting.isChatAdminUser(this.props.account) &&
      !(useGlobalAdminCheck ? Setting.isGlobalAdminUser(this.props.account) : Setting.isAdminUser(this.props.account));

    const btnStyle = {
      backgroundColor: "#F8F9FA",
      borderColor: "rgb(229, 229, 234)",
      border: "1px solid #E5E5EA",
      borderRadius: "10px",
      padding: "6px 10px",
    };

    return (
      <Space wrap>
        <Button style={btnStyle} onClick={() => this.submitStoreEdit(false, undefined)}>{i18next.t("general:Save")}</Button>
        <Button style={btnStyle} onClick={() => this.submitStoreEdit(true, undefined)}>{i18next.t("general:Save & Exit")}</Button>
        {this.state.isNewStore && <Button style={btnStyle} onClick={() => this.cancelStoreEdit()}>{i18next.t("general:Cancel")}</Button>}
        {shouldShowClaim && <Button style={btnStyle} onClick={() => this.claimStore()}>{i18next.t("store:Claim")}</Button>}
      </Space>
    );
  }

  renderStoreField(label, control, span = 8, style = {}) {
    return (
      <Col style={{marginTop: "12px", ...style}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "#595959", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderStoreSwitch(label, checked, onChange, span = 6) {
    return this.renderStoreField(label, <Switch checked={checked} onChange={onChange} />, span);
  }

  renderStore() {
    const store = this.state.store;
    const rowGutter = [16, 8];
    const providerOptions = this.state.storageProviders.concat(this.state.casdoorStorageProviders);
    const cardHeadStyle = {background: "transparent", borderBottom: "none", fontWeight: 600, fontSize: "15px", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"};
    const sectionCardStyle = {
      marginBottom: "16px",
      borderRadius: "14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      padding: "18px",
    };

    const renderCardTitle = (title, descKey) => (
      <div>
        <div style={{fontWeight: 600, fontSize: "15px"}}>{title}</div>
        <div style={{fontSize: "13px", color: "#6E6E73", fontWeight: 400, marginTop: "2px"}}>{i18next.t(descKey)}</div>
      </div>
    );

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("store:Edit Store")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            {this.renderStoreActions()}
          </div>
        </div>

        <Card size="small" title={renderCardTitle(i18next.t("provider:General Settings"), "store:General Settings desc")} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row gutter={rowGutter}>
            {this.renderStoreField(
              Setting.getLabel(i18next.t("general:Owner"), i18next.t("general:Owner - Tooltip")),
              Setting.isAdminUser(this.props.account) ? (
                <Select
                  style={{width: "100%"}}
                  showSearch
                  value={store.owner}
                  loading={this.state.ownerUsersLoading}
                  onDropdownVisibleChange={(open) => {
                    if (open) {
                      this.loadOwnerUsers();
                    }
                  }}
                  onChange={(value) => this.updateStoreField("owner", value)}
                  filterOption={(input, option) => {
                    const u = this.state.ownerUsers.find((x) => x.name === option?.value);
                    if (!u) {
                      return true;
                    }
                    const q = (input || "").trim().toLowerCase();
                    if (!q) {
                      return true;
                    }
                    return (u.name && u.name.toLowerCase().includes(q)) ||
                      (u.displayName && u.displayName.toLowerCase().includes(q));
                  }}
                  notFoundContent={this.state.ownerUsersLoading ? <Spin size="small" /> : null}
                >
                  {this.state.ownerUsers.map((u) => {
                    const dn = u.displayName || u.name;
                    return (
                      <Option key={u.name} value={u.name}>
                        <span style={{display: "flex", alignItems: "center", gap: 8}}>
                          <Avatar size="small" src={u.avatar || undefined}>
                            {(dn || "?").charAt(0)}
                          </Avatar>
                          <span>{`${dn} (${u.name})`}</span>
                        </span>
                      </Option>
                    );
                  })}
                </Select>
              ) : (
                <Input value={store.owner} disabled />
              ),
              8
            )}
            {store.sharedBy ? this.renderStoreField(
              Setting.getLabel(i18next.t("store:Shared by"), i18next.t("store:Shared by - Tooltip")),
              <Input value={store.sharedBy} disabled />,
              8
            ) : null}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={store.name} onChange={e => {
                this.updateStoreField("name", e.target.value);
              }} disabled={Setting.isUserBoundToStore(this.props.account)} />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={store.displayName} onChange={e => {
                this.updateStoreField("displayName", e.target.value);
              }} />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("general:Title"), i18next.t("general:Title - Tooltip")),
              <Input value={store.title} onChange={e => {
                this.updateStoreField("title", e.target.value);
              }} />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={store.state} onChange={value => {
                this.updateStoreField("state", value);
              }}
              options={[
                {value: "Active", label: i18next.t("general:Active")},
                {value: "Inactive", label: i18next.t("general:Inactive")},
              ].map(item => Setting.getOption(item.label, item.value))} />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("general:Avatar"), i18next.t("general:Avatar - Tooltip")),
              <StoreAvatarUploader
                store={store}
                onUpdate={(newUrl) => {
                  this.updateStoreField("avatar", newUrl);
                }}
                onUploadComplete={(newUrl) => {
                  this.submitStoreEdit(false, undefined);
                }}
              />,
              12
            )}
            {this.renderStoreSwitch(
              Setting.getLabel(i18next.t("store:Is default"), i18next.t("store:Is default - Tooltip")),
              store.isDefault,
              checked => {
                this.updateStoreField("isDefault", checked);
              },
              6
            )}
            {this.renderStoreSwitch(
              Setting.getLabel(i18next.t("store:Enable extra options"), i18next.t("store:Enable extra options - Tooltip")),
              store.enableExtraOptions,
              checked => {
                this.updateStoreField("enableExtraOptions", checked);
              },
              6
            )}
          </Row>
        </Card>

        <Card size="small" title={renderCardTitle(i18next.t("general:Providers"), "store:Providers desc")} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row gutter={rowGutter}>
            {store.enableExtraOptions ? (
              <>
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Storage provider"), i18next.t("store:Storage provider - Tooltip")),
                  <Select virtual={false} style={{width: "100%"}} value={store.storageProvider} onChange={(value => {this.updateStoreField("storageProvider", value);})}>
                    {providerOptions.map((provider, index) => this.renderProviderOption(provider, index))}
                  </Select>,
                  12
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Image provider"), i18next.t("store:Image provider - Tooltip")),
                  <Select virtual={false} style={{width: "100%"}} value={store.imageProvider} onChange={(value => {this.updateStoreField("imageProvider", value);})}>
                    <Option key="none" value="">
                      {i18next.t("general:empty")}
                    </Option>
                    {providerOptions.map((provider, index) => this.renderProviderOption(provider, index))}
                  </Select>,
                  12
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Storage subpath"), i18next.t("store:Storage subpath - Tooltip")),
                  <Input value={store.storageSubpath} onChange={e => {
                    this.updateStoreField("storageSubpath", e.target.value);
                  }} />,
                  this.isAIStorageProvider(store.storageProvider) ? 12 : 8
                )}
                {this.isAIStorageProvider(store.storageProvider) ? this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Vector store id"), i18next.t("store:Vector store id - Tooltip")),
                  <Input value={store.vectorStoreId} onChange={e => {
                    this.updateStoreField("vectorStoreId", e.target.value);
                  }} />,
                  12
                ) : null}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Split provider"), i18next.t("store:Split provider - Tooltip")),
                  <Select virtual={false} style={{width: "100%"}} value={store.splitProvider} onChange={(value => {this.updateStoreField("splitProvider", value);})}
                    options={[{name: "Default"}, {name: "Basic"}, {name: "QA"}, {name: "Markdown"}].map((provider) => Setting.getOption(provider.name, provider.name))
                    } />,
                  8
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Search provider"), i18next.t("store:Search provider - Tooltip")),
                  <Select virtual={false} style={{width: "100%"}} value={store.searchProvider} onChange={(value => {this.updateStoreField("searchProvider", value);})}
                    options={[{name: "Default"}, {name: "Hierarchy"}].map((provider) => Setting.getOption(provider.name, provider.name))
                    } />,
                  8
                )}
              </>
            ) : null}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("provider:Model provider"), i18next.t("provider:Model provider - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={store.modelProvider} onChange={(value => {this.updateStoreField("modelProvider", value);})}>
                {this.state.modelProviders.map((provider, index) => this.renderProviderOption(provider, index))}
              </Select>,
              12
            )}
            {store.enableExtraOptions ? (
              <>
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Embedding provider"), i18next.t("store:Embedding provider - Tooltip")),
                  <Select virtual={false} style={{width: "100%"}} value={store.embeddingProvider} onChange={(value => {this.updateStoreField("embeddingProvider", value);})}>
                    <Option key="none" value="">
                      {i18next.t("general:empty")}
                    </Option>
                    {this.state.embeddingProviders.map((provider, index) => this.renderProviderOption(provider, index))}
                  </Select>,
                  12
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:MCP server"), i18next.t("store:MCP server - Tooltip")),
                  <Select virtual={false} style={{width: "100%"}} value={store.mcpServer} onChange={(value => {this.updateStoreField("mcpServer", value);})}>
                    <Option key="Empty" value="">{i18next.t("general:empty")}</Option>
                    {this.state.mcpServers.map((server, index) => (
                      <Option key={index} value={server.name}>{server.displayName || server.name}</Option>
                    ))}
                  </Select>,
                  12
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("general:Skills"), i18next.t("general:Skills - Tooltip")),
                  <Select
                    virtual={false}
                    mode="multiple"
                    allowClear
                    style={{width: "100%"}}
                    placeholder={i18next.t("store:Select skills")}
                    value={store.skills || []}
                    onChange={(value => {this.updateStoreField("skills", value || []);})}
                  >
                    {this.state.skills.filter(s => s.state === "Active").map((skill, index) => (
                      <Option key={index} value={skill.name}>
                        {skill.displayName ? `${skill.displayName} (${skill.name})` : skill.name}
                      </Option>
                    ))}
                  </Select>,
                  12
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("general:Tools"), i18next.t("general:Tools - Tooltip")),
                  <Select
                    virtual={false}
                    mode="multiple"
                    allowClear
                    style={{width: "100%"}}
                    placeholder={i18next.t("store:Select tools")}
                    value={store.tools || []}
                    onChange={(value => {this.updateStoreField("tools", value || []);})}
                  >
                    {this.state.tools.map((tool, index) => this.renderToolOption(tool, index))}
                  </Select>,
                  12
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Builtin tools"), i18next.t("store:Builtin tools - Tooltip")),
                  this.renderBuiltinTools(),
                  12
                )}
              </>
            ) : null}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Text-to-Speech provider"), i18next.t("store:Text-to-Speech provider - Tooltip")),
              <Select virtual={false} style={{width: "100%"}} value={store.textToSpeechProvider} onChange={(value => {this.updateStoreField("textToSpeechProvider", value);})}>
                <Option key="Empty" value="">{i18next.t("general:empty")}</Option>
                <Option key="Browser Built-In" value="Browser Built-In">Browser Built-In</Option>
                {this.state.textToSpeechProviders.map((provider, index) => this.renderProviderOption(provider, index))}
              </Select>,
              12
            )}
            {store.enableExtraOptions ? (
              <>
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Speech-to-Text provider"), i18next.t("store:Speech-to-Text provider - Tooltip")),
                  <Select virtual={false} style={{width: "100%"}} value={store.speechToTextProvider} onChange={(value => {this.updateStoreField("speechToTextProvider", value);})}>
                    <Option key="Empty" value="">{i18next.t("general:empty")}</Option>
                    <Option key="Browser Built-In" value="Browser Built-In">Browser Built-In</Option>
                    {this.state.speechToTextProviders.map((provider, index) => this.renderProviderOption(provider, index))}
                  </Select>,
                  12
                )}
                {this.renderStoreSwitch(
                  Setting.getLabel(i18next.t("store:Enable TTS streaming"), i18next.t("store:Enable TTS streaming - Tooltip")),
                  store.enableTtsStreaming,
                  checked => {
                    this.updateStoreField("enableTtsStreaming", checked);
                  },
                  6
                )}
              </>
            ) : null}
            {store.enableExtraOptions ? (
              <>
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Frequency"), i18next.t("store:Frequency - Tooltip")),
                  <InputNumber min={0} style={{width: "100%"}} value={store.frequency} onChange={value => {
                    this.updateStoreField("frequency", value);
                  }} />,
                  8
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Limit minutes"), i18next.t("store:Limit minutes - Tooltip")),
                  <InputNumber min={0} style={{width: "100%"}} value={store.limitMinutes} onChange={value => {
                    this.updateStoreField("limitMinutes", value);
                  }} />,
                  8
                )}
              </>
            ) : null}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Memory limit"), i18next.t("store:Memory limit - Tooltip")),
              <InputNumber min={0} style={{width: "100%"}} value={store.memoryLimit} onChange={value => {
                this.updateStoreField("memoryLimit", value);
              }} />,
              8
            )}
          </Row>
        </Card>

        <Card size="small" title={renderCardTitle(i18next.t("general:Chat"), "store:Chat desc")} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row gutter={rowGutter}>
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Welcome"), i18next.t("store:Welcome - Tooltip")),
              <Input value={store.welcome} onChange={e => {
                this.updateStoreField("welcome", e.target.value);
              }} />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Welcome title"), i18next.t("store:Welcome title - Tooltip")),
              <Input
                value={store.welcomeTitle} onChange={e => {
                  this.updateStoreField("welcomeTitle", e.target.value);
                }}
              />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Welcome text"), i18next.t("store:Welcome text - Tooltip")),
              <Input
                value={store.welcomeText} onChange={e => {
                  this.updateStoreField("welcomeText", e.target.value);
                }}
              />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Prompt"), i18next.t("store:Prompt - Tooltip")),
              <TextArea autoSize={{minRows: 1, maxRows: 15}} value={store.prompt} onChange={(e) => {
                this.updateStoreField("prompt", e.target.value);
              }} />,
              24
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Example questions"), i18next.t("store:Example questions - Tooltip")),
              <ExampleQuestionTable table={store.exampleQuestions} onUpdateTable={(exampleQuestions) => {
                this.updateStoreField("exampleQuestions", exampleQuestions);
              }} />,
              24
            )}
          </Row>
        </Card>

        <Card size="small" title={renderCardTitle(i18next.t("general:Options"), "store:Options desc")} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row gutter={rowGutter}>
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Knowledge count"), i18next.t("store:Knowledge count - Tooltip")),
              <InputNumber style={{width: "100%"}} min={0} max={100} value={store.knowledgeCount} onChange={value => {
                this.updateStoreField("knowledgeCount", value);
              }} />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Suggestion count"), i18next.t("store:Suggestion count - Tooltip")),
              <InputNumber style={{width: "100%"}} min={0} max={10} value={store.suggestionCount} onChange={value => {
                this.updateStoreField("suggestionCount", value);
              }} />,
              8
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Memory limit"), i18next.t("store:Memory limit - Tooltip")),
              <InputNumber style={{width: "100%"}} min={0} value={store.memoryLimit} onChange={value => {
                this.updateStoreField("memoryLimit", value);
              }} />,
              8
            )}
            {store.enableExtraOptions ? (
              <>
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Frequency"), i18next.t("store:Frequency - Tooltip")),
                  <InputNumber style={{width: "100%"}} min={0} value={store.frequency} onChange={value => {
                    this.updateStoreField("frequency", value);
                  }} />,
                  8
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Limit minutes"), i18next.t("store:Limit minutes - Tooltip")),
                  <InputNumber style={{width: "100%"}} min={0} value={store.limitMinutes} onChange={value => {
                    this.updateStoreField("limitMinutes", value);
                  }} />,
                  8
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Vector stores"), i18next.t("store:Vector stores - Tooltip")),
                  <Select virtual={false} mode="tags" style={{width: "100%"}} value={store.vectorStores} onChange={(value => {this.updateStoreField("vectorStores", value);})}>
                    {this.state.stores?.filter(item => item.name !== store.name).map((item) => <Option key={item.name} value={item.name}>{`${item.displayName} (${item.name})`}</Option>)}
                  </Select>,
                  12
                )}
                {this.renderStoreField(
                  Setting.getLabel(i18next.t("store:Child stores"), i18next.t("store:Child stores - Tooltip")),
                  <Select virtual={false} mode="tags" style={{width: "100%"}} value={store.childStores} onChange={(value => {this.updateStoreField("childStores", value);})}>
                    {this.state.stores?.filter(item => item.name !== store.name).map((item) => <Option key={item.name} value={item.name}>{`${item.displayName} (${item.name})`}</Option>)}
                  </Select>,
                  12
                )}
              </>
            ) : null}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Child model providers"), i18next.t("store:Child model providers - Tooltip")),
              <Select virtual={false} mode="tags" style={{width: "100%"}} value={store.childModelProviders} onChange={(value => {this.updateStoreField("childModelProviders", value);})}>
                {this.state.modelProviders?.map((item, index) => this.renderProviderOption(item, index))}
              </Select>,
              12
            )}
            {this.renderStoreField(
              Setting.getLabel(i18next.t("store:Forbidden words"), i18next.t("store:Forbidden words - Tooltip")),
              <Select virtual={false} mode="tags" style={{width: "100%"}} value={store.forbiddenWords} onChange={(value => {this.updateStoreField("forbiddenWords", value);})}>
              </Select>,
              12
            )}
            {this.renderStoreSwitch(
              Setting.getLabel(i18next.t("store:Show auto read"), i18next.t("store:Show auto read - Tooltip")),
              store.showAutoRead,
              checked => {
                this.updateStoreField("showAutoRead", checked);
              },
              8
            )}
            {this.renderStoreSwitch(
              Setting.getLabel(i18next.t("store:Disable file upload"), i18next.t("store:Disable file upload - Tooltip")),
              store.disableFileUpload,
              checked => {
                this.updateStoreField("disableFileUpload", checked);
              },
              8
            )}
            {this.renderStoreSwitch(
              Setting.getLabel(i18next.t("store:Hide thinking"), i18next.t("store:Hide thinking - Tooltip")),
              store.hideThinking,
              checked => {
                this.updateStoreField("hideThinking", checked);
              },
              8
            )}
          </Row>
        </Card>

        <Card size="small" title={renderCardTitle(Setting.getLabel(i18next.t("store:File tree"), i18next.t("store:File tree - Tooltip")), "store:File tree desc")} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <FileTree account={this.props.account} store={store} onUpdateStore={(store) => {
            this.setState({
              store: store,
            });
            this.submitStoreEdit(undefined, store);
          }} onRefresh={() => this.getStore()} />
        </Card>
      </div>
    );
  }

  submitStoreEdit(exitAfterSave, storeParam) {
    let store = Setting.deepCopy(this.state.store);
    if (storeParam) {
      store = storeParam;
    }

    store.fileTree = undefined;
    StoreBackend.updateStore(this.state.owner, this.state.storeName, store)
      .then((res) => {
        if (res.status === "ok") {
          if (res.data) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
            this.setState({
              storeName: this.state.store.name,
              isNewStore: false,
            });
            window.dispatchEvent(new Event("storesChanged"));
            if (exitAfterSave) {
              this.props.history.push("/stores");
            } else {
              this.props.history.push(`/stores/${this.state.store.owner}/${this.state.store.name}`);
            }
          } else {
            Setting.showMessage("error", i18next.t("general:Failed to connect to server"));
            this.updateStoreField("name", this.state.storeName);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  claimStore() {
    Modal.confirm({
      title: i18next.t("store:Claim"),
      okText: i18next.t("general:OK"),
      cancelText: i18next.t("general:Cancel"),
      onOk: () => {
        StoreBackend.claimStore(this.state.store.owner, this.state.store.name)
          .then((res) => {
            if (res.status === "ok") {
              Setting.showMessage("success", i18next.t("general:Successfully saved"));
              window.dispatchEvent(new Event("storesChanged"));
              this.setState({
                store: res.data,
                owner: res.data.owner,
                storeName: res.data.name,
              });
              this.props.history.push(`/stores/${res.data.owner}/${res.data.name}`);
            } else {
              Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
            }
          })
          .catch(error => {
            Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
          });
      },
    });
  }

  cancelStoreEdit() {
    if (this.state.isNewStore) {
      StoreBackend.deleteStore(this.state.store)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            window.dispatchEvent(new Event("storesChanged"));
            this.props.history.push("/stores");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/stores");
    }
  }

  render() {
    return (
      <div style={{background: "#F1F3F5", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {
          this.state.store !== null ? this.renderStore() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
      </div>
    );
  }
}

export default StoreEditPage;
