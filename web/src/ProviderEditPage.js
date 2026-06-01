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
import {AutoComplete, Button, Card, Col, Input, InputNumber, Row, Select, Slider, Space, Switch} from "antd";
import {LinkOutlined, SyncOutlined} from "@ant-design/icons";
import * as ProviderBackend from "./backend/ProviderBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import copy from "copy-to-clipboard";
import FileSaver from "file-saver";
import ModelTestWidget from "./common/TestModelWidget";
import TtsTestWidget from "./common/TestTtsWidget";
import EmbedTestWidget from "./common/TestEmbedWidget";
import TestMcpWidget from "./common/TestMcpWidget";

const {Option} = Select;
const {TextArea} = Input;

class ProviderEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      providerName: props.match.params.providerName,
      provider: null,
      originalProvider: null,
      isNewProvider: props.location?.state?.isNewProvider || false,
      fetchedModels: [],
      isFetchingModels: false,
    };
  }

  getProviderModels() {
    this.setState({isFetchingModels: true});
    ProviderBackend.getProviderModels(this.state.provider)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            fetchedModels: res.data,
            isFetchingModels: false,
          });
          Setting.showMessage("success", i18next.t("provider:Successfully fetched models"));
        } else {
          this.setState({isFetchingModels: false});
          Setting.showMessage("error", `${i18next.t("provider:Failed to fetch models")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({isFetchingModels: false});
        Setting.showMessage("error", `${i18next.t("provider:Failed to fetch models")}: ${error?.message || error}`);
      });
  }

  UNSAFE_componentWillMount() {
    this.getProvider();
  }

  getProvider() {
    ProviderBackend.getProvider("admin", this.state.providerName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            provider: res.data,
            originalProvider: Setting.deepCopy(res.data),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  getClientIdLabel(provider) {
    if (["Model", "Embedding"].includes(provider.category)) {
      if (provider.type === "Tencent Cloud") {
        return Setting.getLabel(i18next.t("general:Secret ID"), i18next.t("general:Secret ID - Tooltip"));
      } else if (provider.type === "Baidu Cloud") {
        return Setting.getLabel(i18next.t("provider:API key"), i18next.t("provider:API key - Tooltip"));
      } else if (provider.type === "Azure") {
        return Setting.getLabel(i18next.t("provider:Deployment name"), i18next.t("provider:Deployment name - Tooltip"));
      } else if (provider.type === "MiniMax") {
        return Setting.getLabel(i18next.t("provider:Group ID"), i18next.t("provider:Group ID - Tooltip"));
      }
    }
    if (provider.category === "Storage") {
      if (provider.type === "Alibaba Cloud OSS") {
        return Setting.getLabel(i18next.t("provider:Client ID"), i18next.t("provider:Client ID - Tooltip"));
      }
      return Setting.getLabel(i18next.t("store:Storage subpath"), i18next.t("store:Storage subpath - Tooltip"));
    }
    return Setting.getLabel(i18next.t("provider:Client ID"), i18next.t("provider:Client ID - Tooltip"));
  }

  getNetworkLabel(provider) {
    if (provider.category === "Blockchain") {
      if (provider.type === "ChainMaker") {
        return Setting.getLabel(i18next.t("general:Node address"), i18next.t("general:Node address - Tooltip"));
      }
    }
    return Setting.getLabel(i18next.t("general:Network"), i18next.t("general:Network - Tooltip"));
  }

  getProviderUrlLabel(provider) {
    if (["Model", "Blockchain"].includes(provider.category)) {
      if (provider.type === "Volcano Engine") {
        return Setting.getLabel(i18next.t("provider:Endpoint ID"), i18next.t("provider:Endpoint ID - Tooltip"));
      } else if (provider.type === "OpenAI Compatible") {
        return Setting.getLabel(i18next.t("provider:Endpoint"), i18next.t("provider:Endpoint - Tooltip"));
      } else if (provider.type === "ChainMaker") {
        return Setting.getLabel(i18next.t("general:Provider URL"), i18next.t("general:Provider URL - Tooltip"));
      }
    }
    return Setting.getLabel(i18next.t("general:Provider URL"), i18next.t("general:Provider URL - Tooltip"));
  }

  getProviderKeyLabel(provider) {
    return Setting.getLabel(i18next.t("provider:Provider key"), i18next.t("provider:Provider key - Tooltip"));
  }

  modelCategoryShowsProviderUrlInput(type) {
    return ["Local", "Ollama", "Azure", "Volcano Engine", "Tencent Cloud", "OpenCode"].includes(type);
  }

  getRegionLabel(provider) {
    if (provider.category === "Blockchain") {
      if (provider.type === "ChainMaker") {
        return Setting.getLabel(i18next.t("general:Org ID"), i18next.t("general:Org ID - Tooltip"));
      }
    }
    return Setting.getLabel(i18next.t("general:Region"), i18next.t("general:Region - Tooltip"));
  }

  getClientSecretLabel(provider) {
    if (["Storage", "Embedding", "Text-to-Speech", "Speech-to-Text"].includes(provider.category)) {
      if (provider.type === "Baidu Cloud") {
        return Setting.getLabel(i18next.t("general:Access secret"), i18next.t("general:Access secret - Tooltip"));
      }
      return Setting.getLabel(i18next.t("general:Secret key"), i18next.t("general:Secret key - Tooltip"));
    } else if (provider.category === "Model") {
      return Setting.getLabel(i18next.t("provider:API key"), i18next.t("provider:API key - Tooltip"));
    } else if (provider.category === "Blockchain") {
      if (provider.type === "Ethereum") {
        return Setting.getLabel(i18next.t("provider:Private key"), i18next.t("provider:Private key - Tooltip"));
      }
    }
    return Setting.getLabel(i18next.t("provider:Client secret"), i18next.t("provider:Client secret - Tooltip"));
  }

  shouldShowClientIdInput(provider) {
    return (
      ((provider.category === "Embedding" && provider.type === "Baidu Cloud") ||
        (provider.category === "Embedding" && provider.type === "Tencent Cloud") ||
        provider.category === "Storage") ||
      (provider.category === "Blockchain" && !["ChainMaker", "Ethereum"].includes(provider.type)) ||
      ((provider.category === "Model" || provider.category === "Embedding") && provider.type === "Azure") ||
      (!(["Storage", "Model", "Embedding", "Text-to-Speech", "Speech-to-Text", "Blockchain"].includes(provider.category)))
    );
  }

  shouldShowClientSecretInput(provider) {
    return !(
      (provider.category === "Storage" && provider.type !== "Alibaba Cloud OSS") ||
      (provider.category === "Blockchain" && provider.type === "ChainMaker") ||
      provider.type === "Ollama"
    );
  }

  getContractNameLabel(provider) {
    if (provider.category === "Blockchain") {
      if (provider.type === "Ethereum") {
        return Setting.getLabel(i18next.t("provider:Contract address"), i18next.t("provider:Contract address - Tooltip"));
      }
    }
    return Setting.getLabel(i18next.t("provider:Contract name"), i18next.t("provider:Contract name - Tooltip"));
  }

  parseProviderField(key, value) {
    if (["topK"].includes(key)) {
      value = Setting.myParseInt(value);
    } else if (["temperature", "topP", "frequencyPenalty", "presencePenalty"].includes(key)) {
      value = Setting.myParseFloat(value);
    }
    return value;
  }

  updateProviderField(key, value) {
    value = this.parseProviderField(key, value);

    const provider = this.state.provider;
    provider[key] = value;
    this.setState({
      provider: provider,
    });
  }

  shouldShowProviderDisplayName2Field() {
    const lang = Setting.getLanguage();
    if (!lang || lang === "null") {
      return false;
    }
    return lang !== "en" && !lang.startsWith("en-");
  }

  isTemperatureEnabled(provider) {
    if (provider.category === "Model") {
      if (["OpenRouter", "iFlytek", "Hugging Face", "Baidu Cloud", "MiniMax", "Gemini", "Alibaba Cloud", "Baichuan", "Volcano Engine", "DeepSeek", "StepFun", "Tencent Cloud", "Mistral", "Yi", "Silicon Flow", "Ollama", "Writer"].includes(provider.type)) {
        return true;
      } else if (provider.type === "OpenAI") {
        if (provider.subType.includes("o1") || provider.subType.includes("o3") || provider.subType.includes("o4")) {
          return false;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  isTopPEnabled(provider) {
    if (provider.category === "Model") {
      if (["OpenRouter", "Baidu Cloud", "Gemini", "Alibaba Cloud", "Baichuan", "Volcano Engine", "DeepSeek", "StepFun", "Tencent Cloud", "Mistral", "Yi", "Silicon Flow", "Ollama", "Writer"].includes(provider.type)) {
        return true;
      } else if (provider.type === "OpenAI") {
        if (provider.subType.includes("o1") || provider.subType.includes("o3") || provider.subType.includes("o4")) {
          return false;
        } else {
          return true;
        }
      }
    }
    return false;
  }

  InputSlider(props) {
    const {
      min,
      max,
      step,
      value,
      onChange,
      disabled,
    } = props;

    return (
      <>
        <Col span={2}>
          <InputNumber
            min={min}
            max={max}
            step={step}
            style={{width: "100%"}}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </Col>
        <Col span={20}>
          <Slider
            min={min}
            max={max}
            step={step}
            style={{
              marginLeft: "1%",
              marginRight: "1%",
            }}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </Col>
      </>
    );
  }

  renderProvider() {
    const editorWidth = Setting.isMobile() ? 22 : 9;
    const isRemote = this.state.provider.isRemote;
    const provider = this.state.provider;
    const isModelProvider = provider.category === "Model";

    const colSpan = Setting.isMobile() ? 22 : 22;

    const sectionCardStyle = {
      marginBottom: "16px",
      borderRadius: "14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      padding: "18px",
    };

    const cardHeadStyle = {background: "transparent", borderBottom: "none", fontWeight: 600, fontSize: "15px"};

    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>
            {isRemote ? i18next.t("general:View") : i18next.t("provider:Edit Provider")}
          </span>
          {!isRemote && (
            <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
              <Button onClick={() => this.submitProviderEdit(false)}>{i18next.t("general:Save")}</Button>
              <Button onClick={() => this.submitProviderEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
              {this.state.isNewProvider && <Button onClick={() => this.cancelProviderEdit()}>{i18next.t("general:Cancel")}</Button>}
            </div>
          )}
        </div>

        {/* Card 1: General Settings */}
        <Card size="small" title={i18next.t("general:General Settings")} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <Row style={{marginTop: "10px"}} gutter={16}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 11}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:ID"), i18next.t("general:Name - Tooltip"))}</div>
              <Input disabled={isRemote} value={provider.name} onChange={e => {
                this.updateProviderField("name", e.target.value);
              }} />
            </Col>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 11}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip"))}</div>
              <Input disabled={isRemote} value={provider.displayName} onChange={e => {
                this.updateProviderField("displayName", e.target.value);
              }} />
            </Col>
          </Row>
          {this.shouldShowProviderDisplayName2Field() ? (
            <Row style={{marginTop: "20px"}} gutter={16}>
              <Col span={colSpan}>
                <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:Display name 2"), i18next.t("general:Display name 2 - Tooltip"))}</div>
                <Input disabled={isRemote} value={provider.displayName2 ?? ""} onChange={e => {
                  this.updateProviderField("displayName2", e.target.value);
                }} />
              </Col>
            </Row>
          ) : null}
          <Row style={{marginTop: "20px"}} gutter={16}>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 7}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:Category"), i18next.t("provider:Category - Tooltip"))}</div>
              <Select virtual={false} disabled={isRemote} style={{width: "100%"}} value={provider.category} onChange={(value => {
                this.updateProviderField("category", value);
                if (value === "Storage") {
                  this.updateProviderField("type", "Local File System");
                } else if (value === "Model") {
                  this.updateProviderField("type", "OpenAI");
                  this.updateProviderField("subType", "gpt-4");
                } else if (value === "Embedding") {
                  this.updateProviderField("type", "OpenAI");
                  this.updateProviderField("subType", "AdaSimilarity");
                } else if (value === "Video") {
                  this.updateProviderField("type", "AWS");
                } else if (value === "Text-to-Speech") {
                  this.updateProviderField("type", "Alibaba Cloud");
                  this.updateProviderField("subType", "cosyvoice-v1");
                } else if (value === "Speech-to-Text") {
                  this.updateProviderField("type", "Alibaba Cloud");
                  this.updateProviderField("subType", "paraformer-realtime-v1");
                }
              })}>
                {
                  [
                    {id: "Storage", name: "Storage"},
                    {id: "Model", name: "Model"},
                    {id: "Embedding", name: "Embedding"},
                    {id: "Blockchain", name: "Blockchain"},
                    {id: "Video", name: "Video"},
                    {id: "Text-to-Speech", name: "Text-to-Speech"},
                    {id: "Speech-to-Text", name: "Speech-to-Text"},
                  ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
                }
              </Select>
            </Col>
            <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 8}>
              <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("general:Type"), i18next.t("general:Type - Tooltip"))}</div>
              <Select virtual={false} disabled={isRemote} style={{width: "100%"}} value={provider.type} onChange={(value => {
                this.updateProviderField("type", value);
                this.setState({fetchedModels: []});
                if (provider.category === "Model") {
                  if (value === "OpenAI Compatible") {
                    this.updateProviderField("subType", "gpt-image-2");
                  } else if (value === "OpenAI") {
                    this.updateProviderField("subType", "gpt-4");
                  } else if (value === "Gemini") {
                    this.updateProviderField("subType", "gemini-pro");
                  } else if (value === "OpenRouter") {
                    this.updateProviderField("subType", "openai/gpt-4");
                  } else if (value === "iFlytek") {
                    this.updateProviderField("subType", "spark4.0-ultra");
                  } else if (value === "Baidu Cloud") {
                    this.updateProviderField("subType", "ernie-4.0-8k");
                  } else if (value === "MiniMax") {
                    this.updateProviderField("subType", "MiniMax-Text-01");
                  } else if (value === "Claude") {
                    this.updateProviderField("subType", "claude-opus-4-0");
                  } else if (value === "Hugging Face") {
                    this.updateProviderField("subType", "gpt2");
                  } else if (value === "ChatGLM") {
                    this.updateProviderField("subType", "chatglm2-6b");
                  } else if (value === "Ollama") {
                    this.updateProviderField("subType", "llama3.3:70b");
                  } else if (value === "Local") {
                    this.updateProviderField("subType", "custom-model");
                  } else if (value === "Azure") {
                    this.updateProviderField("subType", "gpt-4");
                  } else if (value === "Cohere") {
                    this.updateProviderField("subType", "command");
                  } else if (value === "Alibaba Cloud") {
                    this.updateProviderField("subType", "qwen-long");
                  } else if (value === "Moonshot") {
                    this.updateProviderField("subType", "Moonshot-v1-8k");
                  } else if (value === "Amazon Bedrock") {
                    this.updateProviderField("subType", "Claude");
                  } else if (value === "Baichuan") {
                    this.updateProviderField("subType", "Baichuan2-Turbo");
                  } else if (value === "Volcano Engine") {
                    this.updateProviderField("subType", "Doubao-lite-4k");
                  } else if (value === "DeepSeek") {
                    this.updateProviderField("subType", "deepseek-v4-pro");
                  } else if (value === "StepFun") {
                    this.updateProviderField("subType", "step-1-8k");
                  } else if (value === "Tencent Cloud") {
                    this.updateProviderField("subType", "hunyuan-turbo");
                  } else if (value === "Yi") {
                    this.updateProviderField("subType", "yi-lightning");
                  } else if (value === "Silicon Flow") {
                    this.updateProviderField("subType", "deepseek-ai/DeepSeek-R1");
                  } else if (value === "GitHub") {
                    this.updateProviderField("subType", "gpt-4o");
                  } else if (value === "Writer") {
                    this.updateProviderField("subType", "palmyra-x5");
                  } else if (value === "OpenCode") {
                    this.updateProviderField("subType", "");
                  }
                } else if (provider.category === "Embedding") {
                  if (value === "OpenAI") {
                    this.updateProviderField("subType", "AdaSimilarity");
                  } else if (value === "Gemini") {
                    this.updateProviderField("subType", "embedding-001");
                  } else if (value === "Hugging Face") {
                    this.updateProviderField("subType", "sentence-transformers/all-MiniLM-L6-v2");
                  } else if (value === "Cohere") {
                    this.updateProviderField("subType", "embed-english-v2.0");
                  } else if (value === "Baidu Cloud") {
                    this.updateProviderField("subType", "Embedding-V1");
                  } else if (value === "Local") {
                    this.updateProviderField("subType", "custom-embedding");
                  } else if (value === "Azure") {
                    this.updateProviderField("subType", "AdaSimilarity");
                  }
                } else if (provider.category === "Text-to-Speech") {
                  if (value === "Alibaba Cloud") {
                    this.updateProviderField("subType", "cosyvoice-v1");
                  }
                } else if (provider.category === "Speech-to-Text") {
                  if (value === "Alibaba Cloud") {
                    this.updateProviderField("subType", "paraformer-realtime-v1");
                  }
                }
              })}
              showSearch
              filterOption={(input, option) =>
                option.children[1].toLowerCase().includes(input.toLowerCase())
              }
              >
                {
                  Setting.getProviderTypeOptions(provider.category)
                    .map((item, index) => <Option key={index} value={item.name}>
                      <img width={20} height={20} style={{marginBottom: "3px", marginRight: "10px"}} src={Setting.getProviderLogoURL({category: provider.category, type: item.name})} alt={item.name} />
                      {item.name}
                    </Option>)
                }
              </Select>
            </Col>
            {
              !["Model", "Embedding", "Text-to-Speech", "Speech-to-Text"].includes(provider.category) ? null : (
                <Col style={{marginTop: "5px"}} span={Setting.isMobile() ? 22 : 7}>
                  <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("provider:Sub type"), i18next.t("provider:Sub type - Tooltip"))}</div>
                  <Space.Compact style={{width: "100%"}}>
                    {provider.type === "Ollama" ? (
                      <AutoComplete
                        style={{flex: 1}}
                        value={provider.subType}
                        disabled={isRemote}
                        onChange={(value) => {
                          this.updateProviderField("subType", value);
                        }}
                        options={((this.state.fetchedModels || []).length > 0 ? this.state.fetchedModels.map(m => ({id: m, name: m})) : Setting.getProviderSubTypeOptions(provider.category, provider.type)).map((item) => Setting.getOption(item.name, item.id))}
                        placeholder={i18next.t("provider:Please select or enter the model name")}
                      />
                    ) : (
                      <Select
                        virtual={false}
                        style={{flex: 1}}
                        value={provider.subType}
                        disabled={isRemote || provider.type === "OpenCode"}
                        onChange={(value) => {
                          this.updateProviderField("subType", value);
                        }}
                        showSearch
                        filterOption={(input, option) =>
                          option.children.toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {((this.state.fetchedModels || []).length > 0 ? this.state.fetchedModels.map(m => ({id: m, name: m})) : Setting.getProviderSubTypeOptions(provider.category, provider.type))
                          .map((item, index) => (
                            <Option key={index} value={item.id}>{item.name}</Option>
                          ))
                        }
                      </Select>
                    )}
                    {["OpenAI", "OpenRouter", "Local", "OpenAI Compatible", "Ollama", "DeepSeek", "Moonshot", "Grok", "Silicon Flow", "Mistral", "StepFun"].includes(provider.type) && (
                      <Button
                        type="primary"
                        icon={<SyncOutlined spin={this.state.isFetchingModels} />}
                        aria-label={i18next.t("provider:Fetch models")}
                        title={i18next.t("provider:Fetch models")}
                        onClick={() => this.getProviderModels()}
                        loading={this.state.isFetchingModels}
                      />
                    )}
                  </Space.Compact>
                </Col>
              )
            }
          </Row>
          {
            (this.state.provider.category === "Model" && this.state.provider.type === "OpenAI Compatible") ? (
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {this.getProviderUrlLabel(this.state.provider)}
                </Col>
                <Col span={22} >
                  <Input prefix={<LinkOutlined />} value={this.state.provider.providerUrl} onChange={e => {
                    this.updateProviderField("providerUrl", e.target.value);
                  }} />
                </Col>
              </Row>
            ) : null
          }
          {
            (this.state.provider.category !== "Model" || this.modelCategoryShowsProviderUrlInput(this.state.provider.type)) && !(this.state.provider.category === "Storage" && this.state.provider.type === "Alibaba Cloud OSS") && this.state.provider.category !== "Blockchain" ? (
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {this.getProviderUrlLabel(this.state.provider)}
                </Col>
                <Col span={22} >
                  <Input prefix={<LinkOutlined />} value={this.state.provider.providerUrl} onChange={e => {
                    this.updateProviderField("providerUrl", e.target.value);
                  }} />
                </Col>
              </Row>
            ) : null
          }
          {
            ((this.state.provider.category === "Model" || this.state.provider.category === "Embedding") && this.state.provider.type === "Azure") ? (
              <Row style={{marginTop: "20px"}}>
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(i18next.t("provider:API version"), i18next.t("provider:API version - Tooltip"))}
                </Col>
                <Col span={22} >
                  <AutoComplete disabled={isRemote} style={{width: "100%"}} value={this.state.provider.apiVersion}
                    options={Setting.getProviderAzureApiVersionOptions().map((item) => Setting.getOption(item.name, item.id))}
                    onChange={(value) => {this.updateProviderField("apiVersion", value);}}
                  />
                </Col>
              </Row>
            ) : null
          }
          {
            (this.state.provider.type === "Cohere" && this.state.provider.category === "Embedding") && (
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {Setting.getLabel(i18next.t("provider:Input type"), i18next.t("provider:Input type - Tooltip"))}
                </Col>
                <Col span={22} >
                  <Select virtual={false} disabled={isRemote} style={{width: "100%"}} value={this.state.provider.clientId} onChange={(value => {this.updateProviderField("clientId", value);})}>
                    {
                      ["search_document", "search_query"]
                        .map((item, index) => <Option key={index} value={item}>{item}</Option>)
                    }
                  </Select>
                </Col>
              </Row>
            )
          }
          {
            this.shouldShowClientIdInput(this.state.provider) ? (
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {this.getClientIdLabel(this.state.provider)}
                </Col>
                <Col span={22} >
                  <Input disabled={isRemote} value={this.state.provider.clientId} onChange={e => {
                    this.updateProviderField("clientId", e.target.value);
                  }} />
                </Col>
              </Row>
            ) : null
          }
          {
            (this.state.provider.type === "Local") ? (
              <>
                <Row style={{marginTop: "20px"}}>
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Compatible provider"), i18next.t("provider:Compatible provider - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <AutoComplete
                      style={{width: "100%"}}
                      value={this.state.provider.compatibleProvider}
                      disabled={isRemote}
                      onChange={(value) => {
                        this.updateProviderField("compatibleProvider", value);
                      }}
                      options={Setting.getCompatibleProviderOptions(this.state.provider.category).map((item) => Setting.getOption(item.name, item.id))}
                      placeholder="Please select or enter the compatible provider"
                    />
                  </Col>
                </Row>
              </>
            ) : null
          }
          {
            !(this.state.provider.category === "Model" && (this.state.provider.type === "Local" || this.state.provider.type === "Ollama" || this.state.provider.type === "OpenAI Compatible")) ? null : (
              <>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Input price / 1k tokens"), i18next.t("provider:Input price / 1k tokens - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <InputNumber min={0} value={this.state.provider.inputPricePerThousandTokens} onChange={value => {
                      this.updateProviderField("inputPricePerThousandTokens", value);
                    }} />
                  </Col>
                </Row>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Output price / 1k tokens"), i18next.t("provider:Output price / 1k tokens - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <InputNumber min={0} value={this.state.provider.outputPricePerThousandTokens} onChange={value => {
                      this.updateProviderField("outputPricePerThousandTokens", value);
                    }} />
                  </Col>
                </Row>
              </>
            )
          }
          {
            !(this.state.provider.category === "Embedding" && (this.state.provider.type === "Local" || this.state.provider.type === "Ollama")) ? null : (
              <>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Input price / 1k tokens"), i18next.t("provider:Input price / 1k tokens - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <InputNumber min={0} value={this.state.provider.inputPricePerThousandTokens} onChange={value => {
                      this.updateProviderField("inputPricePerThousandTokens", value);
                    }} />
                  </Col>
                </Row>
              </>
            )
          }
          {
            (this.state.provider.type === "Local" || this.state.provider.type === "Ollama" || this.state.provider.type === "OpenAI Compatible") ? (
              <>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Currency"), i18next.t("provider:Currency - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <Select virtual={false} disabled={isRemote} style={{width: "100%"}} value={this.state.provider.currency} onChange={(value => {
                      this.updateProviderField("currency", value);
                    })}>
                      {
                        [
                          {id: "USD", name: "USD"},
                          {id: "CNY", name: "CNY"},
                          {id: "EUR", name: "EUR"},
                          {id: "JPY", name: "JPY"},
                          {id: "GBP", name: "GBP"},
                          {id: "AUD", name: "AUD"},
                          {id: "CAD", name: "CAD"},
                          {id: "CHF", name: "CHF"},
                          {id: "HKD", name: "HKD"},
                          {id: "SGD", name: "SGD"},
                        ].map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
                      }
                    </Select>
                  </Col>
                </Row>
              </>
            ) : null
          }
          {
            (this.state.provider.category === "Text-to-Speech" && this.state.provider.type === "Alibaba Cloud" && this.state.provider.subType === "cosyvoice-v1") ? (
              <>
                <Row style={{marginTop: "20px"}}>
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Flavor"), i18next.t("provider:Flavor - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <Select virtual={false} disabled={isRemote} style={{width: "100%"}} value={this.state.provider.flavor} onChange={(value => {
                      this.updateProviderField("flavor", value);
                    })}>
                      {
                        Setting.getTtsFlavorOptions(this.state.provider.type, this.state.provider.subType)
                          .map((item, index) => <Option key={index} value={item.id}>{item.name}</Option>)
                      }
                    </Select>
                  </Col>
                </Row>
              </>
            ) : null
          }
          {
            this.shouldShowClientSecretInput(this.state.provider) ? (
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {this.getClientSecretLabel(this.state.provider)}
                </Col>
                <Col span={22} >
                  <Input.Password disabled={isRemote} value={this.state.provider.clientSecret} onChange={e => {
                    this.updateProviderField("clientSecret", e.target.value);
                  }} />
                </Col>
              </Row>
            ) : null
          }
          {
            (this.state.provider.category === "Model" && this.state.provider.type === "Claude" && Setting.getThinkingModelMaxTokens(this.state.provider.subType) !== 0) ? (
              <>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Enable thinking"), i18next.t("provider:Enable thinking - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <Switch disabled={isRemote} checked={this.state.provider.enableThinking} onChange={checked => {
                      this.updateProviderField("enableThinking", checked);
                    }} />
                  </Col>
                </Row>
                {
                  this.state.provider.enableThinking && (
                    <Row style={{marginTop: "20px"}} >
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("provider:Thinking tokens"), i18next.t("provider:Thinking tokens - Tooltip"))}
                      </Col>
                      <Col span={22} >
                        <InputNumber min={1024} max={Setting.getThinkingModelMaxTokens(this.state.provider.subType) - 1} value={this.state.provider.topK || 1024} onChange={value => {
                          this.updateProviderField("topK", value);
                        }} />
                      </Col>
                    </Row>
                  )
                }
              </>
            ) : null
          }
          {
            (this.state.provider.category === "Storage" && this.state.provider.type === "Alibaba Cloud OSS") ? (
              <>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("general:Region"), i18next.t("general:Region - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <Input disabled={isRemote} value={this.state.provider.region} onChange={e => {
                      this.updateProviderField("region", e.target.value);
                    }} />
                  </Col>
                </Row>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Bucket"), i18next.t("provider:Bucket - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <Input disabled={isRemote} value={this.state.provider.domain} onChange={e => {
                      this.updateProviderField("domain", e.target.value);
                    }} />
                  </Col>
                </Row>
                <Row style={{marginTop: "20px"}} >
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Endpoint"), i18next.t("provider:Endpoint - Tooltip"))}
                  </Col>
                  <Col span={22} >
                    <Input disabled={isRemote} value={this.state.provider.providerUrl} onChange={e => {
                      this.updateProviderField("providerUrl", e.target.value);
                    }} />
                  </Col>
                </Row>
              </>
            ) : null
          }
          {
            ["Storage", "Model", "Embedding", "Text-to-Speech", "Speech-to-Text"].includes(this.state.provider.category) || (this.state.provider.category === "Blockchain" && this.state.provider.type === "Ethereum") ? null : (
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {this.getRegionLabel(this.state.provider)}
                </Col>
                <Col span={22} >
                  <Input disabled={isRemote} value={this.state.provider.region} onChange={e => {
                    this.updateProviderField("region", e.target.value);
                  }} />
                </Col>
              </Row>
            )
          }
          {
            this.state.provider.category === "Blockchain" && (
              <>
                <Row style={{marginTop: "20px"}}>
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {this.getProviderUrlLabel(this.state.provider)}
                  </Col>
                  <Col span={22}>
                    <Input prefix={<LinkOutlined />} value={this.state.provider.providerUrl} onChange={e => {
                      this.updateProviderField("providerUrl", e.target.value);
                    }} />
                  </Col>
                </Row>
                {this.state.provider.type === "Ethereum" ? null : (
                  <>
                    <Row style={{marginTop: "20px"}}>
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("provider:Chain"), i18next.t("provider:Chain - Tooltip"))}
                      </Col>
                      <Col span={22}>
                        <Input disabled={isRemote} value={this.state.provider.chain} onChange={e => {
                          this.updateProviderField("chain", e.target.value);
                        }} />
                      </Col>
                    </Row>
                    <Row style={{marginTop: "20px"}}>
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {this.getNetworkLabel(this.state.provider)}
                      </Col>
                      <Col span={22}>
                        <Input disabled={isRemote} value={this.state.provider.network} onChange={e => {
                          this.updateProviderField("network", e.target.value);
                        }} />
                      </Col>
                    </Row>
                  </>
                )}
                {this.state.provider.type === "ChainMaker" ? (
                  <>
                    <Row style={{marginTop: "20px"}}>
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("provider:Auth type"), i18next.t("provider:Auth type - Tooltip"))}
                      </Col>
                      <Col span={22}>
                        <Select
                          virtual={false}
                          style={{width: "100%"}}
                          value={this.state.provider.text}
                          onChange={value => {
                            this.updateProviderField("text", value);
                          }}
                        >
                          <Select.Option value="permissionedwithcert">permissionedwithcert</Select.Option>
                          <Select.Option value="permissionedwithkey">permissionedwithkey</Select.Option>
                          <Select.Option value="public">public</Select.Option>
                        </Select>
                      </Col>
                    </Row>
                    <Row style={{marginTop: "20px"}} >
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("cert:User cert"), i18next.t("cert:User cert - Tooltip"))}
                      </Col>
                      <Col span={editorWidth} >
                        <Button style={{marginRight: "10px", marginBottom: "10px"}} disabled={this.state.provider.userCert === ""} onClick={() => {
                          copy(this.state.provider.userCert);
                          Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
                        }}
                        >
                          {i18next.t("general:Copy")}
                        </Button>
                        <Button type="primary" disabled={this.state.provider.userCert === ""} onClick={() => {
                          const blob = new Blob([this.state.provider.userCert], {type: "text/plain;charset=utf-8"});
                          FileSaver.saveAs(blob, "user_cert.pem");
                        }}
                        >
                          {i18next.t("general:Download")}
                        </Button>
                        <TextArea autoSize={{minRows: 16, maxRows: 16}} value={this.state.provider.userCert} onChange={e => {
                          this.updateProviderField("userCert", e.target.value);
                        }} />
                      </Col>
                      <Col span={1} />
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("cert:User key"), i18next.t("cert:User key - Tooltip"))}
                      </Col>
                      <Col span={editorWidth} >
                        <Button style={{marginRight: "10px", marginBottom: "10px"}} disabled={this.state.provider.userKey === ""} onClick={() => {
                          copy(this.state.provider.userKey);
                          Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
                        }}
                        >
                          {i18next.t("general:Copy")}
                        </Button>
                        <Button type="primary" disabled={this.state.provider.userKey === ""} onClick={() => {
                          const blob = new Blob([this.state.provider.userKey], {type: "text/plain;charset=utf-8"});
                          FileSaver.saveAs(blob, "token_jwt_key.key");
                        }}
                        >
                          {i18next.t("general:Download")}
                        </Button>
                        <TextArea autoSize={{minRows: 16, maxRows: 16}} value={this.state.provider.userKey} onChange={e => {
                          this.updateProviderField("userKey", e.target.value);
                        }} />
                      </Col>
                    </Row>
                    <Row style={{marginTop: "20px"}} >
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("cert:Sign cert"), i18next.t("cert:Sign cert - Tooltip"))}
                      </Col>
                      <Col span={editorWidth} >
                        <Button style={{marginRight: "10px", marginBottom: "10px"}} disabled={this.state.provider.signCert === ""} onClick={() => {
                          copy(this.state.provider.signCert);
                          Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
                        }}
                        >
                          {i18next.t("general:Copy")}
                        </Button>
                        <Button type="primary" disabled={this.state.provider.signCert === ""} onClick={() => {
                          const blob = new Blob([this.state.provider.signCert], {type: "text/plain;charset=utf-8"});
                          FileSaver.saveAs(blob, "user_cert.pem");
                        }}
                        >
                          {i18next.t("general:Download")}
                        </Button>
                        <TextArea autoSize={{minRows: 16, maxRows: 16}} value={this.state.provider.signCert} onChange={e => {
                          this.updateProviderField("signCert", e.target.value);
                        }} />
                      </Col>
                      <Col span={1} />
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("cert:Sign key"), i18next.t("cert:Sign key - Tooltip"))}
                      </Col>
                      <Col span={editorWidth} >
                        <Button style={{marginRight: "10px", marginBottom: "10px"}} disabled={this.state.provider.signKey === ""} onClick={() => {
                          copy(this.state.provider.signKey);
                          Setting.showMessage("success", i18next.t("general:Copied to clipboard successfully"));
                        }}
                        >
                          {i18next.t("general:Copy")}
                        </Button>
                        <Button type="primary" disabled={this.state.provider.signKey === ""} onClick={() => {
                          const blob = new Blob([this.state.provider.signKey], {type: "text/plain;charset=utf-8"});
                          FileSaver.saveAs(blob, "token_jwt_key.key");
                        }}
                        >
                          {i18next.t("general:Download")}
                        </Button>
                        <TextArea autoSize={{minRows: 16, maxRows: 16}} value={this.state.provider.signKey} onChange={e => {
                          this.updateProviderField("signKey", e.target.value);
                        }} />
                      </Col>
                    </Row>
                  </>
                ) : null}
                {["Ethereum", "ChainMaker"].includes(this.state.provider.type) ? (
                  <>
                    <Row style={{marginTop: "20px"}}>
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {this.getContractNameLabel(this.state.provider)}
                      </Col>
                      <Col span={22}>
                        <Input disabled={isRemote} value={this.state.provider.contractName} onChange={e => {
                          this.updateProviderField("contractName", e.target.value);
                        }} />
                      </Col>
                    </Row>
                    <Row style={{marginTop: "20px"}}>
                      <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                        {Setting.getLabel(i18next.t("provider:Invoke method"), i18next.t("provider:Invoke method - Tooltip"))}
                      </Col>
                      <Col span={22}>
                        <Input disabled={isRemote} value={this.state.provider.contractMethod} onChange={e => {
                          this.updateProviderField("contractMethod", e.target.value);
                        }} />
                      </Col>
                    </Row>
                  </>
                ) : null}
                <Row style={{marginTop: "20px"}}>
                  <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                    {Setting.getLabel(i18next.t("provider:Browser URL"), i18next.t("provider:Browser URL - Tooltip"))}
                  </Col>
                  <Col span={22}>
                    <Input prefix={<LinkOutlined />} value={this.state.provider.browserUrl}
                      placeholder={this.state.provider.type === "ChainMaker" ? "https://explorer-testnet.chainmaker.org.cn/chainmaker_testnet_chain/block/{bh}" : ""}
                      onChange={e => {
                        this.updateProviderField("browserUrl", e.target.value);
                      }} />
                  </Col>
                </Row>
              </>
            )
          }
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("store:Is default"), i18next.t("store:Is default - Tooltip"))}
            </Col>
            <Col span={1}>
              <Switch disabled={isRemote} checked={this.state.provider.isDefault} onChange={checked => {
                this.updateProviderField("isDefault", checked);
              }} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}} >
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("provider:Is remote"), i18next.t("provider:Is remote - Tooltip"))}
            </Col>
            <Col span={1}>
              <Switch disabled checked={this.state.provider.isRemote} />
            </Col>
          </Row>
          <Row style={{marginTop: "20px"}}>
            <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
              {Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip"))}
            </Col>
            <Col span={22}>
              <Select virtual={false} disabled={isRemote} style={{width: "100%"}} value={this.state.provider.state} onChange={value => {
                this.updateProviderField("state", value);
              }}
              options={[
                {value: "Active", label: i18next.t("general:Active")},
                {value: "Inactive", label: i18next.t("general:Inactive")},
              ].map(item => Setting.getOption(item.label, item.value))} />
            </Col>
          </Row>
          {
            this.state.provider.category === "Model" ? (
              <Row style={{marginTop: "20px"}} >
                <Col style={{marginTop: "5px"}} span={(Setting.isMobile()) ? 22 : 2}>
                  {this.getProviderKeyLabel(this.state.provider)}
                </Col>
                <Col span={22} >
                  <Input.Password
                    value={this.state.provider.providerKey}
                    disabled={!Setting.isAdminUser(this.props.account)}
                    onChange={e => {
                      this.updateProviderField("providerKey", e.target.value);
                    }}
                  />
                </Col>
              </Row>
            ) : null
          }
        </Card>

        {/* Card 2: Advanced Model Parameters */}
        {isModelProvider && (this.isTemperatureEnabled(provider) || this.isTopPEnabled(provider) || (provider.type === "Gemini")) && (
          <Card size="small" title={i18next.t("provider:Advanced Model Parameters")} style={sectionCardStyle} headStyle={cardHeadStyle}>
            {this.isTemperatureEnabled(provider) ? (
              <Row style={{marginTop: "10px"}} gutter={16}>
                <Col span={Setting.isMobile() ? 22 : 14}>
                  <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("provider:Temperature"), i18next.t("provider:Temperature - Tooltip"))}</div>
                  <Slider
                    min={0}
                    max={["Alibaba Cloud", "Gemini", "OpenAI", "OpenRouter", "Baichuan", "DeepSeek", "StepFun", "Tencent Cloud", "Mistral", "Yi", "Ollama", "Writer"].includes(provider.type) ? 2 : 1}
                    step={0.01}
                    value={provider.temperature}
                    disabled={isRemote}
                    onChange={(value) => {
                      this.updateProviderField("temperature", value);
                    }}
                  />
                </Col>
                <Col span={Setting.isMobile() ? 22 : 2}>
                  <div style={{marginBottom: "4px"}}>&nbsp;</div>
                  <InputNumber
                    min={0}
                    max={["Alibaba Cloud", "Gemini", "OpenAI", "OpenRouter", "Baichuan", "DeepSeek", "StepFun", "Tencent Cloud", "Mistral", "Yi", "Ollama", "Writer"].includes(provider.type) ? 2 : 1}
                    step={0.01}
                    style={{width: "100%"}}
                    value={provider.temperature}
                    onChange={(value) => {
                      this.updateProviderField("temperature", value);
                    }}
                    disabled={isRemote}
                  />
                </Col>
              </Row>
            ) : null}
            {this.isTopPEnabled(provider) ? (
              <Row style={{marginTop: "20px"}} gutter={16}>
                <Col span={Setting.isMobile() ? 22 : 14}>
                  <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("provider:Top P"), i18next.t("provider:Top P - Tooltip"))}</div>
                  <Slider
                    min={0}
                    max={1.0}
                    step={0.01}
                    value={provider.topP}
                    disabled={isRemote}
                    onChange={(value) => {
                      this.updateProviderField("topP", value);
                    }}
                  />
                </Col>
                <Col span={Setting.isMobile() ? 22 : 2}>
                  <div style={{marginBottom: "4px"}}>&nbsp;</div>
                  <InputNumber
                    min={0}
                    max={1.0}
                    step={0.01}
                    style={{width: "100%"}}
                    value={provider.topP}
                    onChange={(value) => {
                      this.updateProviderField("topP", value);
                    }}
                    disabled={isRemote}
                  />
                </Col>
              </Row>
            ) : null}
            {(isModelProvider && (this.isTemperatureEnabled(provider) || this.isTopPEnabled(provider))) ? (
              <Row style={{marginTop: "20px"}} gutter={16}>
                {this.isTemperatureEnabled(provider) ? (
                  <Col span={Setting.isMobile() ? 22 : 12}>
                    <div style={{marginBottom: "4px"}}>
                      {Setting.getLabel(i18next.t("provider:Presence penalty"), i18next.t("provider:Presence penalty - Tooltip"))}
                    </div>
                    <Slider
                      min={provider.type === "OpenAI" ? -2 : 1}
                      max={2}
                      step={0.01}
                      value={provider.presencePenalty ?? 0}
                      disabled={isRemote}
                      onChange={(value) => {
                        this.updateProviderField("presencePenalty", value);
                      }}
                    />
                    <div style={{textAlign: "right", fontSize: "12px", color: "#888", marginTop: "2px"}}>
                      {Setting.myParseFloat(provider.presencePenalty ?? 0).toFixed(2)}
                    </div>
                  </Col>
                ) : null}
                {this.isTopPEnabled(provider) ? (
                  <Col span={Setting.isMobile() ? 22 : 12}>
                    <div style={{marginBottom: "4px"}}>
                      {Setting.getLabel(i18next.t("provider:Frequency penalty"), i18next.t("provider:Frequency penalty - Tooltip"))}
                    </div>
                    <Slider
                      min={-2}
                      max={2}
                      step={0.01}
                      value={provider.frequencyPenalty ?? 0}
                      disabled={isRemote}
                      onChange={(value) => {
                        this.updateProviderField("frequencyPenalty", value);
                      }}
                    />
                    <div style={{textAlign: "right", fontSize: "12px", color: "#888", marginTop: "2px"}}>
                      {Setting.myParseFloat(provider.frequencyPenalty ?? 0).toFixed(2)}
                    </div>
                  </Col>
                ) : null}
              </Row>
            ) : null}
            {(provider.category === "Model" && provider.type === "Gemini") ? (
              <Row style={{marginTop: "20px"}} gutter={16}>
                <Col span={Setting.isMobile() ? 22 : 14}>
                  <div style={{marginBottom: "4px"}}>{Setting.getLabel(i18next.t("provider:Top K"), i18next.t("provider:Top K - Tooltip"))}</div>
                  <Slider
                    min={1}
                    max={6}
                    step={1}
                    value={provider.topK}
                    disabled={isRemote}
                    onChange={(value) => {
                      this.updateProviderField("topK", value);
                    }}
                  />
                </Col>
                <Col span={Setting.isMobile() ? 22 : 2}>
                  <div style={{marginBottom: "4px"}}>&nbsp;</div>
                  <InputNumber
                    min={1}
                    max={6}
                    step={1}
                    style={{width: "100%"}}
                    value={provider.topK}
                    onChange={(value) => {
                      this.updateProviderField("topK", value);
                    }}
                    disabled={isRemote}
                  />
                </Col>
              </Row>
            ) : null}
          </Card>
        )}
        {/* Card 3: Provider Test */}
        <Card size="small" title={i18next.t("provider:Provider Test")} style={sectionCardStyle} headStyle={cardHeadStyle}>
          <ModelTestWidget
            provider={this.state.provider}
            originalProvider={this.state.originalProvider}
            account={this.props.account}
          />
          <EmbedTestWidget
            provider={this.state.provider}
            originalProvider={this.state.originalProvider}
            account={this.props.account}
            onUpdateProvider={this.updateProviderField.bind(this)}
          />
          <TtsTestWidget
            provider={this.state.provider}
            originalProvider={this.state.originalProvider}
            account={this.props.account}
            onUpdateProvider={this.updateProviderField.bind(this)}
          />
          <TestMcpWidget
            provider={this.state.provider}
            originalProvider={this.state.originalProvider}
            onUpdateProvider={this.updateProviderField.bind(this)}
          />
        </Card>
      </div>
    );
  }

  submitProviderEdit(exitAfterSave) {
    const provider = Setting.deepCopy(this.state.provider);
    ProviderBackend.updateProvider(this.state.provider.owner, this.state.providerName, provider)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          this.setState({
            providerName: this.state.provider.name,
            isNewProvider: false,
          });

          if (exitAfterSave) {
            this.props.history.push("/providers");
          } else {
            this.props.history.push(`/providers/${this.state.provider.name}`);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error.message || error}`);
      });
  }

  cancelProviderEdit() {
    if (this.state.isNewProvider) {
      ProviderBackend.deleteProvider(this.state.provider)
        .then((res) => {
          if (res.status === "ok") {
            Setting.showMessage("success", i18next.t("general:Cancelled successfully"));
            this.props.history.push("/providers");
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to cancel")}: ${error}`);
        });
    } else {
      this.props.history.push("/providers");
    }
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {
          this.state.provider !== null ? this.renderProvider() : <Loading type="page" tip={i18next.t("general:Loading")} />
        }
      </div>
    );
  }
}

export default ProviderEditPage;
