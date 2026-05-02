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
import {Avatar, Button, Card, Cascader, Col, Input, InputNumber, Modal, Row, Select, Spin, Switch} from "antd";
import * as StoreBackend from "./backend/StoreBackend";
import * as StorageProviderBackend from "./backend/StorageProviderBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as ToolBackend from "./backend/ToolBackend";
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
      agentProviders: [],
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
            agentProviders: res.data.filter(provider => provider.category === "Agent"),
          });
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

  renderStore() {
    return (
      <Card size="small" title={
        <div>
          {i18next.t("store:Edit Store")}&nbsp;&nbsp;&nbsp;&nbsp;
          <Button onClick={() => this.submitStoreEdit(false, undefined)}>{i18next.t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" onClick={() => this.submitStoreEdit(true, undefined)}>{i18next.t("general:Save & Exit")}</Button>
          {this.state.isNewStore && <Button style={{marginLeft: "20px"}} onClick={() => this.cancelStoreEdit()}>{i18next.t("general:Cancel")}</Button>}
          {this.state.store.owner === "admin" && Setting.isChatAdminUser(this.props.account) && !Setting.isAdminUser(this.props.account) && (
            <Button style={{marginLeft: "20px"}} onClick={() => this.claimStore()}>{i18next.t("store:Claim")}</Button>
          )}
        </div>
      } style={{marginLeft: "5px"}} type="inner">
        <Row style={{marginTop: "10px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Owner"), i18next.t("general:Owner - Tooltip"))} :
          </Col>
          <Col span={22} >
            {Setting.isAdminUser(this.props.account) ? (
              <Select
                style={{width: "100%"}}
                showSearch
                value={this.state.store.owner}
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
                  return (
                    (u.name && u.name.toLowerCase().includes(q)) ||
                    (u.displayName && u.displayName.toLowerCase().includes(q))
                  );
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
              <Input value={this.state.store.owner} disabled />
            )}
          </Col>
        </Row>
        {
          this.state.store.sharedBy ? (
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Shared by"), i18next.t("store:Shared by - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Input value={this.state.store.sharedBy} disabled />
              </Col>
            </Row>
          ) : null
        }
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.store.name} onChange={e => {
              this.updateStoreField("name", e.target.value);
            }} disabled={Setting.isUserBoundToStore(this.props.account)} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.store.displayName} onChange={e => {
              this.updateStoreField("displayName", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Title"), i18next.t("general:Title - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.store.title} onChange={e => {
              this.updateStoreField("title", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:Avatar"), i18next.t("general:Avatar - Tooltip"))} :
          </Col>
          <Col span={22} >
            <StoreAvatarUploader
              store={this.state.store}
              onUpdate={(newUrl) => {
                this.updateStoreField("avatar", newUrl);
              }}
              onUploadComplete={(newUrl) => {
                this.submitStoreEdit(false, undefined);
              }}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Is default"), i18next.t("store:Is default - Tooltip"))} :
          </Col>
          <Col span={1}>
            <Switch checked={this.state.store.isDefault} onChange={checked => {
              this.updateStoreField("isDefault", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}}>
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip"))} :
          </Col>
          <Col span={5}>
            <Select virtual={false} style={{width: "100%"}} value={this.state.store.state} onChange={value => {
              this.updateStoreField("state", value);
            }}
            options={[
              {value: "Active", label: i18next.t("general:Active")},
              {value: "Inactive", label: i18next.t("general:Inactive")},
            ].map(item => Setting.getOption(item.label, item.value))} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Enable extra options"), i18next.t("store:Enable extra options - Tooltip"))} :
          </Col>
          <Col span={1}>
            <Switch checked={this.state.store.enableExtraOptions} onChange={checked => {
              this.updateStoreField("enableExtraOptions", checked);
            }} />
          </Col>
        </Row>
        {this.state.store.enableExtraOptions ? (
          <React.Fragment>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Storage provider"), i18next.t("store:Storage provider - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.store.storageProvider} onChange={(value => {this.updateStoreField("storageProvider", value);})}
                >
                  {
                    this.state.storageProviders.concat(this.state.casdoorStorageProviders).map((provider, index) =>
                      this.renderProviderOption(provider, index)
                    )
                  }
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Storage subpath"), i18next.t("store:Storage subpath - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Input value={this.state.store.storageSubpath} onChange={e => {
                  this.updateStoreField("storageSubpath", e.target.value);
                }} />
              </Col>
            </Row>
            {this.isAIStorageProvider(this.state.store.storageProvider) ? (
              <>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("store:Vector store id"), i18next.t("store:Vector store id - Tooltip"))} :
                  </Col>
                  <Col span={22} >
                    <Input value={this.state.store.vectorStoreId} onChange={e => {
                      this.updateStoreField("vectorStoreId", e.target.value);
                    }} />
                  </Col>
                </Row>
              </>
            ) : null}
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Image provider"), i18next.t("store:Image provider - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.store.imageProvider} onChange={(value => {this.updateStoreField("imageProvider", value);})}
                >
                  <Option key="none" value="">
                    {i18next.t("general:empty")}
                  </Option>
                  {
                    this.state.storageProviders.concat(this.state.casdoorStorageProviders).map((provider, index) =>
                      this.renderProviderOption(provider, index)
                    )
                  }
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Split provider"), i18next.t("store:Split provider - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.store.splitProvider} onChange={(value => {this.updateStoreField("splitProvider", value);})}
                  options={[{name: "Default"}, {name: "Basic"}, {name: "QA"}, {name: "Markdown"}].map((provider) => Setting.getOption(provider.name, provider.name))
                  } />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Search provider"), i18next.t("store:Search provider - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.store.searchProvider} onChange={(value => {this.updateStoreField("searchProvider", value);})}
                  options={[{name: "Default"}, {name: "Hierarchy"}].map((provider) => Setting.getOption(provider.name, provider.name))
                  } />
              </Col>
            </Row>
          </React.Fragment>
        ) : null}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("provider:Model provider"), i18next.t("provider:Model provider - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.store.modelProvider} onChange={(value => {this.updateStoreField("modelProvider", value);})}
            >
              {
                this.state.modelProviders.map((provider, index) =>
                  this.renderProviderOption(provider, index)
                )
              }
            </Select>
          </Col>
        </Row>
        {this.state.store.enableExtraOptions ? (
          <React.Fragment>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Embedding provider"), i18next.t("store:Embedding provider - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.store.embeddingProvider} onChange={(value => {this.updateStoreField("embeddingProvider", value);})}
                >
                  <Option key="none" value="">
                    {i18next.t("general:empty")}
                  </Option>
                  {
                    this.state.embeddingProviders.map((provider, index) =>
                      this.renderProviderOption(provider, index)
                    )
                  }
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Agent provider"), i18next.t("store:Agent provider - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.store.agentProvider} onChange={(value => {this.updateStoreField("agentProvider", value);})}>
                  <Option key="Empty" value="">{i18next.t("general:empty")}</Option>
                  {
                    this.state.agentProviders.map((provider, index) => this.renderProviderOption(provider, index))
                  }
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("general:Tools"), i18next.t("general:Tools - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select
                  virtual={false}
                  mode="multiple"
                  allowClear
                  style={{width: "100%"}}
                  placeholder={i18next.t("store:Select tools")}
                  value={this.state.store.tools || []}
                  onChange={(value => {this.updateStoreField("tools", value || []);})}
                >
                  {
                    this.state.tools.map((tool, index) => this.renderToolOption(tool, index))
                  }
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Builtin tools"), i18next.t("store:Builtin tools - Tooltip"))} :
              </Col>
              <Col span={22} >
                {this.renderBuiltinTools()}
              </Col>
            </Row>
          </React.Fragment>
        ) : null}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Text-to-Speech provider"), i18next.t("store:Text-to-Speech provider - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} style={{width: "100%"}} value={this.state.store.textToSpeechProvider} onChange={(value => {this.updateStoreField("textToSpeechProvider", value);})}
            >
              <Option key="Empty" value="">{i18next.t("general:empty")}</Option>
              <Option key="Browser Built-In" value="Browser Built-In">Browser Built-In</Option>
              {
                this.state.textToSpeechProviders.map((provider, index) => this.renderProviderOption(provider, index))
              }
            </Select>
          </Col>
        </Row>
        {this.state.store.enableExtraOptions ? (
          <React.Fragment>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Enable TTS streaming"), i18next.t("store:Enable TTS streaming - Tooltip"))} :
              </Col>
              <Col span={1}>
                <Switch checked={this.state.store.enableTtsStreaming} onChange={checked => {
                  this.updateStoreField("enableTtsStreaming", checked);
                }} />
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Speech-to-Text provider"), i18next.t("store:Speech-to-Text provider - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} style={{width: "100%"}} value={this.state.store.speechToTextProvider} onChange={(value => {this.updateStoreField("speechToTextProvider", value);})}>
                  <Option key="Empty" value="">{i18next.t("general:empty")}</Option>
                  <Option key="Browser Built-In" value="Browser Built-In">Browser Built-In</Option>
                  {
                    this.state.speechToTextProviders.map((provider, index) => this.renderProviderOption(provider, index))
                  }
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Frequency"), i18next.t("store:Frequency - Tooltip"))} :
              </Col>
              <Col span={22} >
                <InputNumber min={0} value={this.state.store.frequency} onChange={value => {
                  this.updateStoreField("frequency", value);
                }} />
              </Col>
            </Row>
          </React.Fragment>
        ) : null}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Memory limit"), i18next.t("store:Memory limit - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber min={0} value={this.state.store.memoryLimit} onChange={value => {
              this.updateStoreField("memoryLimit", value);
            }} />
          </Col>
        </Row>
        {this.state.store.enableExtraOptions ? (
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("store:Limit minutes"), i18next.t("store:Limit minutes - Tooltip"))} :
            </Col>
            <Col span={22} >
              <InputNumber min={0} value={this.state.store.limitMinutes} onChange={value => {
                this.updateStoreField("limitMinutes", value);
              }} />
            </Col>
          </Row>
        ) : null}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Welcome"), i18next.t("store:Welcome - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input value={this.state.store.welcome} onChange={e => {
              this.updateStoreField("welcome", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Welcome title"), i18next.t("store:Welcome title - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input
              value={this.state.store.welcomeTitle} onChange={e => {
                this.updateStoreField("welcomeTitle", e.target.value);
              }}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Welcome text"), i18next.t("store:Welcome text - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Input
              value={this.state.store.welcomeText} onChange={e => {
                this.updateStoreField("welcomeText", e.target.value);
              }}
            />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Prompt"), i18next.t("store:Prompt - Tooltip"))} :
          </Col>
          <Col span={22} >
            <TextArea autoSize={{minRows: 1, maxRows: 15}} value={this.state.store.prompt} onChange={(e) => {
              this.updateStoreField("prompt", e.target.value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Example questions"), i18next.t("store:Example questions - Tooltip"))} :
          </Col>
          <Col span={22} >
            <ExampleQuestionTable table={this.state.store.exampleQuestions} onUpdateTable={(exampleQuestions) => {
              this.updateStoreField("exampleQuestions", exampleQuestions);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Knowledge count"), i18next.t("store:Knowledge count - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber min={0} max={100} value={this.state.store.knowledgeCount} onChange={value => {
              this.updateStoreField("knowledgeCount", value);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Suggestion count"), i18next.t("store:Suggestion count - Tooltip"))} :
          </Col>
          <Col span={22} >
            <InputNumber min={0} max={10} value={this.state.store.suggestionCount} onChange={value => {
              this.updateStoreField("suggestionCount", value);
            }} />
          </Col>
        </Row>
        {this.state.store.enableExtraOptions ? (
          <React.Fragment>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Vector stores"), i18next.t("store:Vector stores - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} mode="tags" style={{width: "100%"}} value={this.state.store.vectorStores} onChange={(value => {this.updateStoreField("vectorStores", value);})}>
                  {
                    this.state.stores?.filter(item => item.name !== this.state.store.name).map((item, index) => <Option key={item.name} value={item.name}>{`${item.displayName} (${item.name})`}</Option>)
                  }
                </Select>
              </Col>
            </Row>
            <Row style={{marginTop: "20px"}} >
              <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                {Setting.getLabel(i18next.t("store:Child stores"), i18next.t("store:Child stores - Tooltip"))} :
              </Col>
              <Col span={22} >
                <Select virtual={false} mode="tags" style={{width: "100%"}} value={this.state.store.childStores} onChange={(value => {this.updateStoreField("childStores", value);})}>
                  {
                    this.state.stores?.filter(item => item.name !== this.state.store.name).map((item, index) => <Option key={item.name} value={item.name}>{`${item.displayName} (${item.name})`}</Option>)
                  }
                </Select>
              </Col>
            </Row>
          </React.Fragment>
        ) : null}
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Child model providers"), i18next.t("store:Child model providers - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode="tags" style={{width: "100%"}} value={this.state.store.childModelProviders} onChange={(value => {this.updateStoreField("childModelProviders", value);})}>
              {
                this.state.modelProviders?.map((item, index) =>
                  this.renderProviderOption(item, index)
                )
              }
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Forbidden words"), i18next.t("store:Forbidden words - Tooltip"))} :
          </Col>
          <Col span={22} >
            <Select virtual={false} mode="tags" style={{width: "100%"}} value={this.state.store.forbiddenWords} onChange={(value => {this.updateStoreField("forbiddenWords", value);})}>
            </Select>
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Show auto read"), i18next.t("store:Show auto read - Tooltip"))} :
          </Col>
          <Col span={1}>
            <Switch checked={this.state.store.showAutoRead} onChange={checked => {
              this.updateStoreField("showAutoRead", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Disable file upload"), i18next.t("store:Disable file upload - Tooltip"))} :
          </Col>
          <Col span={1}>
            <Switch checked={this.state.store.disableFileUpload} onChange={checked => {
              this.updateStoreField("disableFileUpload", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:Hide thinking"), i18next.t("store:Hide thinking - Tooltip"))} :
          </Col>
          <Col span={1}>
            <Switch checked={this.state.store.hideThinking} onChange={checked => {
              this.updateStoreField("hideThinking", checked);
            }} />
          </Col>
        </Row>
        <Row style={{marginTop: "20px"}} >
          <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
            {Setting.getLabel(i18next.t("store:File tree"), i18next.t("store:File tree - Tooltip"))} :
          </Col>
          <Col span={22} >
            <FileTree account={this.props.account} store={this.state.store} onUpdateStore={(store) => {
              this.setState({
                store: store,
              });
              this.submitStoreEdit(undefined, store);
            }} onRefresh={() => this.getStore()} />
          </Col>
        </Row>
      </Card>
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
      <div>
        {
          this.state.store !== null ? this.renderStore() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
        <div style={{marginTop: "20px", marginLeft: "40px"}}>
          <Button size="large" onClick={() => this.submitStoreEdit(false, undefined)}>{i18next.t("general:Save")}</Button>
          <Button style={{marginLeft: "20px"}} type="primary" size="large" onClick={() => this.submitStoreEdit(true, undefined)}>{i18next.t("general:Save & Exit")}</Button>
          {this.state.isNewStore && <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.cancelStoreEdit()}>{i18next.t("general:Cancel")}</Button>}
          {this.state.store !== null && this.state.store.owner === "admin" && Setting.isChatAdminUser(this.props.account) && !Setting.isGlobalAdminUser(this.props.account) && (
            <Button style={{marginLeft: "20px"}} size="large" onClick={() => this.claimStore()}>{i18next.t("store:Claim")}</Button>
          )}
        </div>
      </div>
    );
  }
}

export default StoreEditPage;
