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

import i18next from "i18next";
import {StaticBaseUrl} from "./Conf";

export function getLanguage() {
  return i18next.language;
}

export function getProviderDisplayName(provider) {
  if (!provider) {
    return "";
  }
  const lang = getLanguage();
  const isEn = !lang || lang === "null" || lang === "en" || lang.startsWith("en-");
  if (!isEn) {
    const d2 = (provider.displayName2 || "").trim();
    if (d2) {
      return d2;
    }
  }
  const d1 = (provider.displayName || "").trim();
  if (d1) {
    return d1;
  }
  return provider.name || "";
}

export const Countries = [
  {label: "English", key: "en", country: "US", alt: "English"},
  {label: "中文", key: "zh", country: "CN", alt: "中文"},
];

export function getOtherProviderInfo() {
  const res = {
    Model: {
      "OpenAI": {
        logo: `${StaticBaseUrl}/img/social_openai.svg`,
        url: "https://platform.openai.com",
      },
      "OpenAI Compatible": {
        logo: `${StaticBaseUrl}/img/social_openai.svg`,
        url: "https://platform.openai.com",
      },
      "Gemini": {
        logo: `${StaticBaseUrl}/img/social_gemini.png`,
        url: "https://gemini.google.com/",
      },
      "Hugging Face": {
        logo: `${StaticBaseUrl}/img/social_huggingface.png`,
        url: "https://huggingface.co/",
      },
      "Claude": {
        logo: `${StaticBaseUrl}/img/social_claude.png`,
        url: "https://www.anthropic.com/claude",
      },
      "Grok": {
        logo: `${StaticBaseUrl}/img/social_xai.png`,
        url: "https://x.ai/",
      },
      "OpenRouter": {
        logo: `${StaticBaseUrl}/img/social_openrouter.png`,
        url: "https://openrouter.ai/",
      },
      "Baidu Cloud": {
        logo: `${StaticBaseUrl}/img/social_baidu_cloud.png`,
        url: "https://cloud.baidu.com/",
      },
      "iFlytek": {
        logo: `${StaticBaseUrl}/img/social_iflytek.png`,
        url: "https://www.iflytek.com/",
      },
      "ChatGLM": {
        logo: `${StaticBaseUrl}/img/social_chatglm.png`,
        url: "https://chatglm.cn/",
      },
      "MiniMax": {
        logo: `${StaticBaseUrl}/img/social_minimax.png`,
        url: "https://www.minimax.dev/",
      },
      "Ollama": {
        logo: `${StaticBaseUrl}/img/social_ollama.png`,
        url: "https://ollama.ai/",
      },
      "Local": {
        logo: `${StaticBaseUrl}/img/social_local.jpg`,
        url: "",
      },
      "Azure": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/",
      },
      "Cohere": {
        logo: `${StaticBaseUrl}/img/social_cohere.png`,
        url: "https://cohere.ai/",
      },
      "Moonshot": {
        logo: `${StaticBaseUrl}/img/social_moonshot.png`,
        url: "https://www.moonshot.cn/",
      },
      "Amazon Bedrock": {
        logo: `${StaticBaseUrl}/img/social_aws.png`,
        url: "https://aws.amazon.com/bedrock/",
      },
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
      "Baichuan": {
        logo: `${StaticBaseUrl}/img/social_baichuan-color.png`,
        url: "https://www.baichuan-ai.com/",
      },
      "Volcano Engine": {
        logo: `${StaticBaseUrl}/img/social_volc_engine.jpg`,
        url: "https://www.volcengine.com/",
      },
      "DeepSeek": {
        logo: `${StaticBaseUrl}/img/social_deepseek.png`,
        url: "https://www.deepseek.com/",
      },
      "StepFun": {
        logo: `${StaticBaseUrl}/img/social_stepfun.png`,
        url: "https://www.stepfun.com/",
      },
      "Tencent Cloud": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/",
      },
      "Yi": {
        logo: `${StaticBaseUrl}/img/social_yi.png`,
        url: "https://01.ai/",
      },
      "Silicon Flow": {
        logo: `${StaticBaseUrl}/img/social_silicon_flow.png`,
        url: "https://www.siliconflow.com/",
      },
      "GitHub": {
        logo: `${StaticBaseUrl}/img/social_github.png`,
        url: "https://github.com/",
      },
      "Writer": {
        logo: `${StaticBaseUrl}/img/social_writer.png`,
        url: "https://writer.com",
      },
      "OpenCode": {
        logo: `${StaticBaseUrl}/img/social_opencode.png`,
        url: "https://opencode.ai",
      },
    },
    Embedding: {
      "OpenAI": {
        logo: `${StaticBaseUrl}/img/social_openai.svg`,
        url: "https://platform.openai.com",
      },
      "Gemini": {
        logo: `${StaticBaseUrl}/img/social_gemini.png`,
        url: "https://gemini.google.com/",
      },
      "Hugging Face": {
        logo: `${StaticBaseUrl}/img/social_huggingface.png`,
        url: "https://huggingface.co/",
      },
      "Cohere": {
        logo: `${StaticBaseUrl}/img/social_cohere.png`,
        url: "https://cohere.ai/",
      },
      "Baidu Cloud": {
        logo: `${StaticBaseUrl}/img/social_baidu_cloud.png`,
        url: "https://cloud.baidu.com/",
      },
      "Ollama": {
        logo: `${StaticBaseUrl}/img/social_ollama.png`,
        url: "https://ollama.ai/",
      },
      "Local": {
        logo: `${StaticBaseUrl}/img/social_local.jpg`,
        url: "",
      },
      "Azure": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/",
      },
      "MiniMax": {
        logo: `${StaticBaseUrl}/img/social_minimax.png`,
        url: "https://www.minimax.dev/",
      },
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
      "Tencent Cloud": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/",
      },
      "Jina": {
        logo: `${StaticBaseUrl}/img/social_jina.png`,
        url: "https://jina.ai/",
      },
      "Word2Vec": {
        logo: `${StaticBaseUrl}/img/social_local.jpg`,
        url: "",
      },
    },
    Storage: {
      "Local File System": {
        logo: `${StaticBaseUrl}/img/social_file.png`,
        url: "",
      },
      "AWS S3": {
        logo: `${StaticBaseUrl}/img/social_aws.png`,
        url: "https://aws.amazon.com/s3",
      },
      "MinIO": {
        logo: "https://min.io/resources/img/logo.svg",
        url: "https://min.io/",
      },
      "Alibaba Cloud OSS": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://aliyun.com/product/oss",
      },
      "Tencent Cloud COS": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/product/cos",
      },
      "Azure Blob": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/en-us/services/storage/blobs/",
      },
      "Qiniu Cloud Kodo": {
        logo: `${StaticBaseUrl}/img/social_qiniu_cloud.png`,
        url: "https://www.qiniu.com/solutions/storage",
      },
      "Google Cloud Storage": {
        logo: `${StaticBaseUrl}/img/social_google_cloud.png`,
        url: "https://cloud.google.com/storage",
      },
      "Synology": {
        logo: `${StaticBaseUrl}/img/social_synology.png`,
        url: "https://www.synology.com/en-global/dsm/feature/file_sharing",
      },
      "Casdoor": {
        logo: `${StaticBaseUrl}/img/casdoor.png`,
        url: "https://casdoor.org/docs/provider/storage/overview",
      },
      "CUCloud OSS": {
        logo: `${StaticBaseUrl}/img/social_cucloud.png`,
        url: "https://www.cucloud.cn/product/oss.html",
      },
    },
    Blockchain: {
      "Hyperledger Fabric": {
        logo: `${StaticBaseUrl}/img/social_hyperledger.png`,
        url: "https://www.hyperledger.org/use/fabric",
      },
      "ChainMaker": {
        logo: `${StaticBaseUrl}/img/social_chainmaker.jpg`,
        url: "https://chainmaker.org.cn/",
      },
      "Tencent ChainMaker": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/product/tcm",
      },
      "Tencent ChainMaker (Demo Network)": {
        logo: `${StaticBaseUrl}/img/social_tencent_cloud.jpg`,
        url: "https://cloud.tencent.com/product/tcm",
      },
      "Ethereum": {
        logo: `${StaticBaseUrl}/img/social_ethereum.png`,
        url: "https://ethereum.org/en/",
      },
    },
    Video: {
      "AWS": {
        logo: `${StaticBaseUrl}/img/social_aws.png`,
        url: "https://aws.amazon.com/",
      },
      "Azure": {
        logo: `${StaticBaseUrl}/img/social_azure.png`,
        url: "https://azure.microsoft.com/",
      },
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
    },
    Tool: {
      time: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      web_search: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      shell: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      local_file: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      office: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      web_fetch: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      web_browser: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
      gui: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiauto-win32",
      },
      video_download: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/yt-dlp/yt-dlp",
      },
      browser_use: {
        logo: `${StaticBaseUrl}/img/social_mcp.png`,
        url: "https://github.com/the-open-agent/openagent",
      },
    },
    "Text-to-Speech": {
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
    },
    "Speech-to-Text": {
      "Alibaba Cloud": {
        logo: `${StaticBaseUrl}/img/social_aliyun.png`,
        url: "https://www.alibabacloud.com/",
      },
    },
    "Chat": {
      "Telegram": {
        logo: `${StaticBaseUrl}/img/social_telegram.png`,
        url: "https://telegram.org/",
      },
      "Discord": {
        logo: `${StaticBaseUrl}/img/social_discord.png`,
        url: "https://discord.com/",
      },
      "WhatsApp": {
        logo: `${StaticBaseUrl}/img/social_whatsapp.png`,
        url: "https://www.whatsapp.com/",
      },
      "Slack": {
        logo: `${StaticBaseUrl}/img/social_slack.png`,
        url: "https://slack.com/",
      },
      "Facebook Messenger": {
        logo: `${StaticBaseUrl}/img/social_messenger.png`,
        url: "https://www.messenger.com/",
      },
      "Threads": {
        logo: `${StaticBaseUrl}/img/social_threads.png`,
        url: "https://www.threads.net/",
      },
      "WeChat": {
        logo: `${StaticBaseUrl}/img/social_wechat.png`,
        url: "https://www.wechat.com/",
      },
      "Snapchat": {
        logo: `${StaticBaseUrl}/img/social_snapchat.png`,
        url: "https://kit.snapchat.com/",
      },
      "X Direct Messages": {
        logo: `${StaticBaseUrl}/img/social_x.png`,
        url: "https://developer.twitter.com/",
      },
    },
  };

  return res;
}

export function getCompatibleProviderOptions(category) {
  if (category === "Model") {
    return (
      [
        // GPT-5.5 series (latest)
        {"id": "gpt-5.5", "name": "gpt-5.5"},
        {"id": "gpt-5.5-pro", "name": "gpt-5.5-pro"},
        {"id": "gpt-5.5-instant", "name": "gpt-5.5-instant"},
        {"id": "gpt-5.5-cyber", "name": "gpt-5.5-cyber"},
        // GPT-5.4 series
        {"id": "gpt-5.4", "name": "gpt-5.4"},
        {"id": "gpt-5.4-pro", "name": "gpt-5.4-pro"},
        {"id": "gpt-5.4-mini", "name": "gpt-5.4-mini"},
        {"id": "gpt-5.4-nano", "name": "gpt-5.4-nano"},
        // GPT-5.3 series
        {"id": "gpt-5.3-codex", "name": "gpt-5.3-codex"},
        {"id": "gpt-5.3-chat", "name": "gpt-5.3-chat"},
        // GPT-5.2 series
        {"id": "gpt-5.2", "name": "gpt-5.2"},
        // GPT-5.1 series
        {"id": "gpt-5.1", "name": "gpt-5.1"},
        // GPT-5 series
        {"id": "gpt-5", "name": "gpt-5"},
        {"id": "gpt-5-mini", "name": "gpt-5-mini"},
        {"id": "gpt-5-nano", "name": "gpt-5-nano"},
        {"id": "gpt-5-chat", "name": "gpt-5-chat"},
        {"id": "gpt-5-pro", "name": "gpt-5-pro"},
        // o-series (latest first)
        {"id": "o4-mini", "name": "o4-mini"},
        {"id": "codex-mini", "name": "codex-mini"},
        {"id": "o3-pro", "name": "o3-pro"},
        {"id": "o3", "name": "o3"},
        {"id": "o3-mini", "name": "o3-mini"},
        {"id": "o1-pro", "name": "o1-pro"},
        {"id": "o1", "name": "o1"},
        // GPT-4.1 series
        {"id": "gpt-4.1", "name": "gpt-4.1"},
        {"id": "gpt-4.1-mini", "name": "gpt-4.1-mini"},
        {"id": "gpt-4.1-nano", "name": "gpt-4.1-nano"},
        // GPT-4.5 / GPT-4o series
        {"id": "gpt-4.5", "name": "gpt-4.5"},
        {"id": "gpt-4o", "name": "gpt-4o"},
        {"id": "gpt-4o-2024-08-06", "name": "gpt-4o-2024-08-06"},
        {"id": "gpt-4o-mini", "name": "gpt-4o-mini"},
        {"id": "gpt-4o-mini-2024-07-18", "name": "gpt-4o-mini-2024-07-18"},
        // GPT-4 series (legacy)
        {"id": "gpt-4-turbo", "name": "gpt-4-turbo"},
        {"id": "gpt-4", "name": "gpt-4"},
        // GPT-3.5 (legacy)
        {"id": "gpt-3.5-turbo", "name": "gpt-3.5-turbo"},
      ]
    );
  } else if (category === "Embedding") {
    return (
      [
        {id: "text-embedding-ada-002", name: "text-embedding-ada-002"},
        {id: "text-embedding-3-small", name: "text-embedding-3-small"},
        {id: "text-embedding-3-large", name: "text-embedding-3-large"},
      ]
    );
  }
}

const openaiModels = [
  // GPT-5.5 series (latest)
  {id: "gpt-5.5", name: "gpt-5.5"},
  {id: "gpt-5.5-pro", name: "gpt-5.5-pro"},
  {id: "gpt-5.5-instant", name: "gpt-5.5-instant"},
  {id: "gpt-5.5-cyber", name: "gpt-5.5-cyber"},
  // GPT-5.4 series
  {id: "gpt-5.4", name: "gpt-5.4"},
  {id: "gpt-5.4-pro", name: "gpt-5.4-pro"},
  {id: "gpt-5.4-mini", name: "gpt-5.4-mini"},
  {id: "gpt-5.4-nano", name: "gpt-5.4-nano"},
  // GPT-5.3 series
  {id: "gpt-5.3-codex", name: "gpt-5.3-codex"},
  {id: "gpt-5.3-chat", name: "gpt-5.3-chat"},
  // GPT-5.2 series
  {id: "gpt-5.2", name: "gpt-5.2"},
  {id: "gpt-5.2-chat", name: "gpt-5.2-chat"},
  {id: "gpt-5.2-codex", name: "gpt-5.2-codex"},
  // GPT-5.1 series
  {id: "gpt-5.1", name: "gpt-5.1"},
  {id: "gpt-5.1-chat", name: "gpt-5.1-chat"},
  {id: "gpt-5.1-codex", name: "gpt-5.1-codex"},
  {id: "gpt-5.1-codex-mini", name: "gpt-5.1-codex-mini"},
  {id: "gpt-5.1-codex-max", name: "gpt-5.1-codex-max"},
  // GPT-5 series
  {id: "gpt-5", name: "gpt-5"},
  {id: "gpt-5-mini", name: "gpt-5-mini"},
  {id: "gpt-5-nano", name: "gpt-5-nano"},
  {id: "gpt-5-chat", name: "gpt-5-chat"},
  {id: "gpt-5-codex", name: "gpt-5-codex"},
  {id: "gpt-5-pro", name: "gpt-5-pro"},
  // o-series reasoning models (latest first)
  {id: "o4-mini", name: "o4-mini"},
  {id: "codex-mini", name: "codex-mini"},
  {id: "o3-pro", name: "o3-pro"},
  {id: "o3", name: "o3"},
  {id: "o3-mini", name: "o3-mini"},
  {id: "o1-pro", name: "o1-pro"},
  {id: "o1", name: "o1"},
  {id: "o1-preview", name: "o1-preview"},
  {id: "o1-mini", name: "o1-mini"},
  // GPT-4.1 series
  {id: "gpt-4.1", name: "gpt-4.1"},
  {id: "gpt-4.1-mini", name: "gpt-4.1-mini"},
  {id: "gpt-4.1-nano", name: "gpt-4.1-nano"},
  // GPT-4.5 / GPT-4o series
  {id: "gpt-4.5", name: "gpt-4.5"},
  {id: "gpt-4o", name: "gpt-4o"},
  {id: "gpt-4o-2024-08-06", name: "gpt-4o-2024-08-06"},
  {id: "gpt-4o-mini", name: "gpt-4o-mini"},
  {id: "gpt-4o-mini-2024-07-18", name: "gpt-4o-mini-2024-07-18"},
  // GPT-4 series (legacy)
  {id: "gpt-4-turbo", name: "gpt-4-turbo"},
  {id: "gpt-4", name: "gpt-4"},
  // Specialized / open-weight
  {id: "computer-use-preview", name: "computer-use-preview"},
  {id: "gpt-oss-120b", name: "gpt-oss-120b"},
  {id: "gpt-oss-20b", name: "gpt-oss-20b"},
  // GPT-3.5 (legacy)
  {id: "gpt-3.5-turbo", name: "gpt-3.5-turbo"},
  // Image generation models (latest first)
  {id: "gpt-image-2", name: "gpt-image-2"},
  {id: "gpt-image-1.5", name: "gpt-image-1.5"},
  {id: "gpt-image-1", name: "gpt-image-1"},
  {id: "gpt-image-1-mini", name: "gpt-image-1-mini"},
  {id: "dall-e-3", name: "dall-e-3"},
  {id: "dall-e-2", name: "dall-e-2"},
  // Other
  {id: "deep-research", name: "deep-research"},
];

const openaiEmbeddings = [
  {id: "text-embedding-ada-002", name: "text-embedding-ada-002"},
  {id: "text-embedding-3-small", name: "text-embedding-3-small"},
  {id: "text-embedding-3-large", name: "text-embedding-3-large"},
];

export function getProviderLogoURL(provider) {
  const otherProviderInfo = getOtherProviderInfo();
  if (!provider || !otherProviderInfo[provider.category] || !otherProviderInfo[provider.category][provider.type]) {
    return "";
  }

  return otherProviderInfo[provider.category][provider.type].logo;
}

export function isProviderSupportWebSearch(provider) {
  if (!provider || provider.category !== "Model") {
    return false;
  }

  if (provider.type === "OpenAI") {
    return true;
  }

  if (provider.type === "Alibaba Cloud") {
    // Wanxiang image generation models do not support web search
    if (provider.subType && provider.subType.startsWith("wanx")) {
      return false;
    }

    if (!provider.subType) {
      return true; // Default to true for Alibaba Cloud if subType is not specified
    }

    return true;
  }

  return false;
}

export function getProviderTypeOptions(category) {
  if (category === "Storage") {
    return (
      [
        {id: "Local File System", name: "Local File System"},
        {id: "Alibaba Cloud OSS", name: "Alibaba Cloud OSS"},
      ]
    );
  } else if (category === "Model") {
    return (
      [
        {id: "OpenAI", name: "OpenAI"},
        {id: "OpenAI Compatible", name: "OpenAI Compatible"},
        {id: "Gemini", name: "Gemini"},
        {id: "Hugging Face", name: "Hugging Face"},
        {id: "Claude", name: "Claude"},
        {id: "Grok", name: "Grok"},
        {id: "OpenRouter", name: "OpenRouter"},
        {id: "Baidu Cloud", name: "Baidu Cloud"},
        {id: "iFlytek", name: "iFlytek"},
        {id: "ChatGLM", name: "ChatGLM"},
        {id: "MiniMax", name: "MiniMax"},
        {id: "Ollama", name: "Ollama"},
        {id: "Local", name: "Local"},
        {id: "Azure", name: "Azure"},
        {id: "Cohere", name: "Cohere"},
        {id: "Moonshot", name: "Moonshot"},
        {id: "Amazon Bedrock", name: "Amazon Bedrock"},
        {id: "Alibaba Cloud", name: "Alibaba Cloud"},
        {id: "Baichuan", name: "Baichuan"},
        {id: "Volcano Engine", name: "Volcano Engine"},
        {id: "DeepSeek", name: "DeepSeek"},
        {id: "StepFun", name: "StepFun"},
        {id: "Tencent Cloud", name: "Tencent Cloud"},
        {id: "Yi", name: "Yi"},
        {id: "Silicon Flow", name: "Silicon Flow"},
        {id: "GitHub", name: "GitHub"},
        {id: "Writer", name: "Writer"},
        {id: "OpenCode", name: "OpenCode"},
      ]
    );
  } else if (category === "Embedding") {
    return (
      [
        {id: "OpenAI", name: "OpenAI"},
        {id: "Gemini", name: "Gemini"},
        {id: "Hugging Face", name: "Hugging Face"},
        {id: "Cohere", name: "Cohere"},
        {id: "Baidu Cloud", name: "Baidu Cloud"},
        {id: "Ollama", name: "Ollama"},
        {id: "Local", name: "Local"},
        {id: "Azure", name: "Azure"},
        {id: "MiniMax", name: "MiniMax"},
        {id: "Alibaba Cloud", name: "Alibaba Cloud"},
        {id: "Tencent Cloud", name: "Tencent Cloud"},
        {id: "Jina", name: "Jina"},
        {id: "Word2Vec", name: "Word2Vec"},
      ]
    );
  } else if (category === "Tool") {
    return [
      {id: "time", name: "time"},
      {id: "web_search", name: "web_search"},
      {id: "shell", name: "shell"},
      {id: "local_file", name: "local_file"},
      {id: "office", name: "office"},
      {id: "web_fetch", name: "web_fetch"},
      {id: "web_browser", name: "web_browser"},
      {id: "gui", name: "gui"},
      {id: "video_download", name: "video_download"},
      {id: "browser_use", name: "browser_use"},
    ];
  } else if (category === "Blockchain") {
    return ([
      {id: "Hyperledger Fabric", name: "Hyperledger Fabric"},
      {id: "ChainMaker", name: "ChainMaker"},
      {id: "Tencent ChainMaker", name: "Tencent ChainMaker"},
      {id: "Tencent ChainMaker (Demo Network)", name: "Tencent ChainMaker (Demo Network)"},
      {id: "Ethereum", name: "Ethereum"},
    ]);
  } else if (category === "Video") {
    return (
      [
        {id: "AWS", name: "AWS"},
        {id: "Azure", name: "Azure"},
        {id: "Alibaba Cloud", name: "Alibaba Cloud"},
      ]
    );
  } else if (category === "Text-to-Speech") {
    return [
      {id: "Alibaba Cloud", name: "Alibaba Cloud"},
    ];
  } else if (category === "Speech-to-Text") {
    return [
      {id: "Alibaba Cloud", name: "Alibaba Cloud"},
    ];
  } else if (category === "Chat") {
    return [
      {id: "Telegram", name: "Telegram"},
      {id: "Discord", name: "Discord"},
      {id: "WhatsApp", name: "WhatsApp"},
      {id: "Slack", name: "Slack"},
      {id: "Facebook Messenger", name: "Facebook Messenger"},
      {id: "Threads", name: "Threads"},
      {id: "WeChat", name: "WeChat"},
      {id: "Snapchat", name: "Snapchat"},
      {id: "X Direct Messages", name: "X Direct Messages"},
    ];
  } else {
    return [];
  }
}

export function getTtsFlavorOptions(type, subType) {
  if (type === "Alibaba Cloud" && subType === "cosyvoice-v1") {
    return [
      {id: "longwan", name: "龙婉，女，中文普通话。龙婉声音温柔甜美，富有亲和力，给人温暖陪伴感。"},
      {id: "longcheng", name: "龙橙，男，中文普通话。龙橙声音温柔清澈，富有亲和力，是邻家的温暖大哥哥。"},
      {id: "longhua", name: "龙华，女童，中文普通话。龙华声音活泼可爱，有趣生动，是孩子们的好朋友。"},
      {id: "longxiaochun", name: "龙小淳，女，中英双语。龙小淳的嗓音如丝般柔滑，温暖中流淌着亲切与抚慰，恰似春风吹过心田。"},
      {id: "longxiaoxia", name: "龙小夏，女，中文普通话。龙小夏以温润磁性的声线，宛如夏日细雨，悄然滋润听者心灵，营造恬静氛围。"},
      {id: "longxiaocheng", name: "龙小诚，男，中英双语。龙小诚深邃而稳重的嗓音，犹如醇厚佳酿，散发出成熟魅力。"},
      {id: "longxiaobai", name: "龙小白，女，中文普通话。龙小白以轻松亲和的声调，演绎闲适日常，其嗓音如邻家女孩般亲切自然。"},
      {id: "longlaotie", name: "龙老铁，男，东北口音。龙老铁以纯正东北腔，豪爽直率，幽默风趣，为讲述增添浓郁地方特色与生活气息。"},
      {id: "longshu", name: "龙书，男，中文普通话。龙书以专业、沉稳的播报风格，传递新闻资讯，其嗓音富含权威与信赖感。"},
      {id: "longjing", name: "龙婧，女，中文普通话。龙婧的嗓音庄重而凛然，精准传达严肃主题，赋予话语以权威与力量。"},
      {id: "longmiao", name: "龙妙，女，中文普通话。龙妙声音清澈透亮，优雅如泉水叮咚，赋予朗诵空灵之美，令人陶醉其中。"},
      {id: "longyue", name: "龙悦，女，中文普通话。龙悦以抑扬顿挫、韵味十足的评书腔调，生动讲述故事，引领听众步入传奇世界！"},
      {id: "longyuan", name: "龙媛，女，中文普通话。龙媛以细腻入微、情感丰富的嗓音，将小说人物与情节娓娓道来，引人入胜。"},
      {id: "longfei", name: "龙飞，男，中文普通话。龙飞以冷静而睿智的声线，如高山上的清泉，经久流长，透出庄严的宁静。"},
      {id: "longjielidou", name: "龙杰力豆，儿童，中英双语。龙杰力豆以和煦如春阳的童声娓娓道来，透出了欣欣向荣的生命力，温暖每一个倾听的耳朵。"},
      {id: "longshuo", name: "龙硕，男，中文普通话。龙硕嗓音充满活力与阳光，如暖阳照耀，增添无限正能量，使人精神焕发。"},
      {id: "longtong", name: "龙彤，儿童，中文普通话。龙彤以稚嫩的童声撒欢，像是春日里的小溪，清脆跳跃，流淌着生机勃勃的旋律。"},
      {id: "longxiang", name: "龙祥，男，中文普通话。龙祥以稳如老茶的沉着和淡然，仿佛时光在其声音中慢慢沉淀，让心灵得以安放。"},
      {id: "loongstella", name: "Stella2.0，女，中英双语。Stella2.0以其飒爽利落的嗓音，演绎独立女性风采，展现坚韧与力量之美。"},
      {id: "loongbella", name: "Bella2.0，女，中文普通话。Bella2.0以精准干练的播报风格，传递全球资讯，其专业女声犹如新闻现场的引导者。"},
    ];
  }

  return [];
}

export function getModelSubTypeOptions(type) {
  if (type === "OpenAI" || type === "Azure" || type === "OpenAI Compatible") {
    return openaiModels;
  } else if (type === "Gemini") {
    return [
      // Gemini 3.1 series (Preview)
      {id: "gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview"},
      {id: "gemini-3.1-pro-preview-customtools", name: "gemini-3.1-pro-preview-customtools"},
      {id: "gemini-3.1-flash-lite-preview", name: "gemini-3.1-flash-lite-preview"},
      {id: "gemini-3.1-flash-live-preview", name: "gemini-3.1-flash-live-preview"},
      {id: "gemini-3.1-flash-image-preview", name: "gemini-3.1-flash-image-preview"},
      // Gemini 3 series (Preview)
      {id: "gemini-3-flash-preview", name: "gemini-3-flash-preview"},
      {id: "gemini-3-pro-image-preview", name: "gemini-3-pro-image-preview"},
      // Gemini 2.5 series (Stable)
      {id: "gemini-2.5-pro", name: "gemini-2.5-pro"},
      {id: "gemini-2.5-flash", name: "gemini-2.5-flash"},
      {id: "gemini-2.5-flash-lite", name: "gemini-2.5-flash-lite"},
      // Gemini 2.5 series (Preview)
      {id: "gemini-2.5-flash-lite-preview-09-2025", name: "gemini-2.5-flash-lite-preview-09-2025"},
      {id: "gemini-2.5-flash-native-audio-preview-12-2025", name: "gemini-2.5-flash-native-audio-preview-12-2025"},
      {id: "gemini-2.5-flash-image", name: "gemini-2.5-flash-image"},
      {id: "gemini-2.5-flash-preview-tts", name: "gemini-2.5-flash-preview-tts"},
      {id: "gemini-2.5-pro-preview-tts", name: "gemini-2.5-pro-preview-tts"},
      {id: "gemini-2.5-computer-use-preview-10-2025", name: "gemini-2.5-computer-use-preview-10-2025"},
      // Gemini 2.0 series (Deprecated, shut down June 1, 2026)
      {id: "gemini-2.0-flash", name: "gemini-2.0-flash"},
      {id: "gemini-2.0-flash-001", name: "gemini-2.0-flash-001"},
      {id: "gemini-2.0-flash-lite", name: "gemini-2.0-flash-lite"},
      {id: "gemini-2.0-flash-lite-001", name: "gemini-2.0-flash-lite-001"},
      // Embedding models
      {id: "gemini-embedding-2-preview", name: "gemini-embedding-2-preview"},
      {id: "gemini-embedding-001", name: "gemini-embedding-001"},
      // Specialized models
      {id: "gemini-robotics-er-1.5-preview", name: "gemini-robotics-er-1.5-preview"},
      // Gemma 4
      {id: "gemma-4", name: "gemma-4"},
      // Image generation models
      {id: "imagen-4.0-generate-001", name: "imagen-4.0-generate-001"},
      {id: "imagen-4.0-ultra-generate-001", name: "imagen-4.0-ultra-generate-001"},
      {id: "imagen-4.0-fast-generate-001", name: "imagen-4.0-fast-generate-001"},
      // Video generation models
      {id: "veo-3.1-generate-preview", name: "veo-3.1-generate-preview"},
      {id: "veo-3.1-fast-generate-preview", name: "veo-3.1-fast-generate-preview"},
      {id: "veo-3.1-lite-generate-preview", name: "veo-3.1-lite-generate-preview"},
      {id: "veo-3.0-generate-001", name: "veo-3.0-generate-001"},
      {id: "veo-3.0-fast-generate-001", name: "veo-3.0-fast-generate-001"},
      {id: "veo-2.0-generate-001", name: "veo-2.0-generate-001"},
    ];
  } else if (type === "GitHub") {
    return [
      {id: "gpt-4o", name: "GPT-4o"},
      {id: "gpt-4o-mini", name: "GPT-4o-mini"},
      {id: "Phi-4-multimodal-instruct", name: "Phi-4-multimodal-instruct"},
      {id: "Phi-4-mini-instruct", name: "Phi-4-mini-instruct"},
      {id: "Phi-4", name: "Phi-4"},
      {id: "Mistral-Large-2411", name: "Mistral-Large-2411"},
      {id: "AI21-Jamba-1.5-Large", name: "AI21-Jamba-1.5-Large"},
      {id: "AI21-Jamba-1.5-Mini", name: "AI21-Jamba-1.5-Mini"},
      {id: "Cohere-command-r-08-2024", name: "Cohere-command-r-08-2024"},
      {id: "Cohere-command-r-plus-08-2024", name: "Cohere-command-r-plus-08-2024"},
      {id: "Llama-3.3-70B-Instruct", name: "Llama-3.3-70B-Instruct"},
    ];
  } else if (type === "Hugging Face") {
    return [
      {id: "meta-llama/Llama-2-7b", name: "meta-llama/Llama-2-7b"},
      {id: "tiiuae/falcon-180B", name: "tiiuae/falcon-180B"},
      {id: "bigscience/bloom", name: "bigscience/bloom"},
      {id: "gpt2", name: "gpt2"},
      {id: "baichuan-inc/Baichuan2-13B-Chat", name: "baichuan-inc/Baichuan2-13B-Chat"},
      {id: "THUDM/chatglm2-6b", name: "THUDM/chatglm2-6b"},
    ];
  } else if (type === "Claude") {
    return [
      {id: "claude-opus-4-7", name: "claude-opus-4-7"},
      {id: "claude-opus-4-5", name: "claude-opus-4-5"},
      {id: "claude-opus-4-1", name: "claude-opus-4-1"},
      {id: "claude-opus-4-0", name: "claude-opus-4-0"},
      {id: "claude-opus-4-20250514", name: "claude-opus-4-20250514"},
      {id: "claude-4-opus-20250514", name: "claude-4-opus-20250514"},
      {id: "claude-sonnet-4-0", name: "claude-sonnet-4-0"},
      {id: "claude-sonnet-4-20250514", name: "claude-sonnet-4-20250514"},
      {id: "claude-4-sonnet-20250514", name: "claude-4-sonnet-20250514"},
      {id: "claude-3-7-sonnet-latest", name: "claude-3-7-sonnet-latest"},
      {id: "claude-3-7-sonnet-20250219", name: "claude-3-7-sonnet-20250219"},
      {id: "claude-3-5-haiku-latest", name: "claude-3-5-haiku-latest"},
      {id: "claude-3-5-haiku-20241022", name: "claude-3-5-haiku-20241022"},
      {id: "claude-3-5-sonnet-latest", name: "claude-3-5-sonnet-latest"},
      {id: "claude-3-opus-latest", name: "claude-3-opus-latest"},
      {id: "claude-3-haiku-20240307", name: "claude-3-haiku-20240307"},
    ];
  } else if (type === "OpenRouter") {
    return [
      {id: "anthropic/claude-opus-4-7", name: "anthropic/claude-opus-4-7"},
      {id: "anthropic/claude-opus-4-5", name: "anthropic/claude-opus-4-5"},
      {id: "anthropic/claude-sonnet-4-0", name: "anthropic/claude-sonnet-4-0"},
      {id: "openai/gpt-4.1", name: "openai/gpt-4.1"},
      {id: "openai/gpt-4o", name: "openai/gpt-4o"},
      {id: "openai/o3", name: "openai/o3"},
      {id: "google/gemini-2.5-pro", name: "google/gemini-2.5-pro"},
      {id: "google/gemini-2.5-flash", name: "google/gemini-2.5-flash"},
      {id: "deepseek/deepseek-r1", name: "deepseek/deepseek-r1"},
      {id: "deepseek/deepseek-chat-v3-0324", name: "deepseek/deepseek-chat-v3-0324"},
      {id: "x-ai/grok-3", name: "x-ai/grok-3"},
      {id: "meta-llama/llama-4-maverick", name: "meta-llama/llama-4-maverick"},
      {id: "meta-llama/llama-3.3-70b-instruct", name: "meta-llama/llama-3.3-70b-instruct"},
      {id: "mistralai/mistral-large", name: "mistralai/mistral-large"},
      {id: "qwen/qwen3-235b-a22b", name: "qwen/qwen3-235b-a22b"},
    ];
  } else if (type === "Baidu Cloud") {
    return [
      {id: "ernie-5.0", name: "ernie-5.0"},
      {id: "ernie-5.0-thinking-preview", name: "ernie-5.0-thinking-preview"},
      {id: "ernie-5.0-thinking-latest", name: "ernie-5.0-thinking-latest"},
      {id: "ernie-5.0-thinking-exp", name: "ernie-5.0-thinking-exp"},
      {id: "ernie-4.5-turbo-128k-preview", name: "ernie-4.5-turbo-128k-preview"},
      {id: "ernie-4.5-turbo-128k", name: "ernie-4.5-turbo-128k"},
      {id: "ernie-4.5-turbo-32k", name: "ernie-4.5-turbo-32k"},
      {id: "ernie-4.5-turbo-20260402", name: "ernie-4.5-turbo-20260402"},
      {id: "ernie-4.5-turbo-latest", name: "ernie-4.5-turbo-latest"},
      {id: "ernie-4.5-turbo-vl-preview", name: "ernie-4.5-turbo-vl-preview"},
      {id: "ernie-4.5-turbo-vl", name: "ernie-4.5-turbo-vl"},
      {id: "ernie-4.5-turbo-vl-32k", name: "ernie-4.5-turbo-vl-32k"},
      {id: "ernie-4.5-turbo-vl-32k-preview", name: "ernie-4.5-turbo-vl-32k-preview"},
      {id: "ernie-4.5-turbo-vl-latest", name: "ernie-4.5-turbo-vl-latest"},
      {id: "ernie-4.5-8k-preview", name: "ernie-4.5-8k-preview"},
      {id: "ernie-4.5-vl-28b-a3b", name: "ernie-4.5-vl-28b-a3b"},
      {id: "ernie-4.5-0.3b", name: "ernie-4.5-0.3b"},
      {id: "ernie-4.5-21b-a3b-thinking", name: "ernie-4.5-21b-a3b-thinking"},
      {id: "ernie-4.5-21b-a3b", name: "ernie-4.5-21b-a3b"},
      {id: "ernie-x1.1", name: "ernie-x1.1"},
      {id: "ernie-x1.1-preview", name: "ernie-x1.1-preview"},
      {id: "ernie-x1-turbo-32k", name: "ernie-x1-turbo-32k"},
      {id: "ernie-x1-turbo-32k-preview", name: "ernie-x1-turbo-32k-preview"},
      {id: "ernie-x1-turbo-latest", name: "ernie-x1-turbo-latest"},
      {id: "ernie-x1-32k", name: "ernie-x1-32k"},
      {id: "ernie-x1-32k-preview", name: "ernie-x1-32k-preview"},
      {id: "ernie-speed-pro-128k", name: "ernie-speed-pro-128k"},
      {id: "ernie-lite-pro-128k", name: "ernie-lite-pro-128k"},
      {id: "ernie-char-8k", name: "ernie-char-8k"},
      {id: "ernie-char-fiction-8k", name: "ernie-char-fiction-8k"},
      {id: "ernie-char-fiction-8k-preview", name: "ernie-char-fiction-8k-preview"},
      {id: "ernie-novel-8k", name: "ernie-novel-8k"},
      {id: "ernie-4.0-8k", name: "ernie-4.0-8k"},
      {id: "ernie-4.0-8k-latest", name: "ernie-4.0-8k-latest"},
      {id: "ernie-4.0-8k-preview", name: "ernie-4.0-8k-preview"},
      {id: "ernie-4.0-turbo-8k", name: "ernie-4.0-turbo-8k"},
      {id: "ernie-4.0-turbo-128k", name: "ernie-4.0-turbo-128k"},
      {id: "ernie-4.0-turbo-8k-preview", name: "ernie-4.0-turbo-8k-preview"},
      {id: "ernie-4.0-turbo-8k-latest", name: "ernie-4.0-turbo-8k-latest"},
      {id: "ernie-3.5-8k", name: "ernie-3.5-8k"},
      {id: "ernie-3.5-128k", name: "ernie-3.5-128k"},
      {id: "ernie-3.5-8k-preview", name: "ernie-3.5-8k-preview"},
      {id: "ernie-3.5-128k-preview", name: "ernie-3.5-128k-preview"},
      {id: "deepseek-v3.2", name: "deepseek-v3.2"},
      {id: "deepseek-v3.2-think", name: "deepseek-v3.2-think"},
      {id: "deepseek-v3.1-250821", name: "deepseek-v3.1-250821"},
      {id: "deepseek-v3.1-think-250821", name: "deepseek-v3.1-think-250821"},
      {id: "deepseek-v3", name: "deepseek-v3"},
      {id: "deepseek-r1-250528", name: "deepseek-r1-250528"},
      {id: "deepseek-r1", name: "deepseek-r1"},
      {id: "deepseek-r1-distill-qwen-32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1-distill-qwen-14b", name: "deepseek-r1-distill-qwen-14b"},
      {id: "deepseek-r1-distill-qianfan-70b", name: "deepseek-r1-distill-qianfan-70b"},
      {id: "deepseek-r1-distill-qianfan-8b", name: "deepseek-r1-distill-qianfan-8b"},
      {id: "glm-5.1", name: "glm-5.1"},
      {id: "glm-5", name: "glm-5"},
      {id: "kimi-k2.5", name: "kimi-k2.5"},
      {id: "kimi-k2-instruct", name: "kimi-k2-instruct"},
      {id: "minimax-m2.5", name: "minimax-m2.5"},
      {id: "minimax-m2.1", name: "minimax-m2.1"},
      {id: "qwen3-coder-480b-a35b-instruct", name: "qwen3-coder-480b-a35b-instruct"},
      {id: "qwen3-coder-30b-a3b-instruct", name: "qwen3-coder-30b-a3b-instruct"},
      {id: "qwen3-next-80b-a3b-instruct", name: "qwen3-next-80b-a3b-instruct"},
      {id: "qwen3-next-80b-a3b-thinking", name: "qwen3-next-80b-a3b-thinking"},
      {id: "qwen3-235b-a22b-instruct-2507", name: "qwen3-235b-a22b-instruct-2507"},
      {id: "qwen3-235b-a22b-thinking-2507", name: "qwen3-235b-a22b-thinking-2507"},
      {id: "qwen3-30b-a3b-instruct-2507", name: "qwen3-30b-a3b-instruct-2507"},
      {id: "qwen3-30b-a3b-thinking-2507", name: "qwen3-30b-a3b-thinking-2507"},
      {id: "qwen3-30b-a3b", name: "qwen3-30b-a3b"},
      {id: "qwen3-32b", name: "qwen3-32b"},
      {id: "qwen3-14b", name: "qwen3-14b"},
      {id: "qwen3-8b", name: "qwen3-8b"},
      {id: "qwen3-4b", name: "qwen3-4b"},
      {id: "qwen3-1.7b", name: "qwen3-1.7b"},
      {id: "qwen3-0.6b", name: "qwen3-0.6b"},
      {id: "qwen3-vl-235b-a22b-instruct", name: "qwen3-vl-235b-a22b-instruct"},
      {id: "qwen3-vl-235b-a22b-thinking", name: "qwen3-vl-235b-a22b-thinking"},
      {id: "qwen3-vl-30b-a3b-instruct", name: "qwen3-vl-30b-a3b-instruct"},
      {id: "qwen3-vl-30b-a3b-thinking", name: "qwen3-vl-30b-a3b-thinking"},
      {id: "qwen3-vl-32b-instruct", name: "qwen3-vl-32b-instruct"},
      {id: "qwen3-vl-32b-thinking", name: "qwen3-vl-32b-thinking"},
      {id: "qwen3-vl-8b-instruct", name: "qwen3-vl-8b-instruct"},
      {id: "qwen3-vl-8b-thinking", name: "qwen3-vl-8b-thinking"},
      {id: "qwen3.5-397b-a17b", name: "qwen3.5-397b-a17b"},
      {id: "qwen3.5-122b-a10b", name: "qwen3.5-122b-a10b"},
      {id: "qwen3.5-27b", name: "qwen3.5-27b"},
      {id: "qwen3.5-35b-a3b", name: "qwen3.5-35b-a3b"},
      {id: "qwen2.5-7b-instruct", name: "qwen2.5-7b-instruct"},
      {id: "qwen2.5-vl-7b-instruct", name: "qwen2.5-vl-7b-instruct"},
      {id: "qwen2.5-vl-32b-instruct", name: "qwen2.5-vl-32b-instruct"},
      {id: "qwq-32b", name: "qwq-32b"},
      {id: "qianfan-check-vl", name: "qianfan-check-vl"},
      {id: "qianfan-vl-70b", name: "qianfan-vl-70b"},
      {id: "qianfan-vl-8b", name: "qianfan-vl-8b"},
      {id: "qianfan-vl-1.5-flash", name: "qianfan-vl-1.5-flash"},
      {id: "qianfan-funccaller", name: "qianfan-funccaller"},
      {id: "qianfan-toytalk", name: "qianfan-toytalk"},
      {id: "qianfan-llama-vl-8b", name: "qianfan-llama-vl-8b"},
      {id: "qianfan-composition", name: "qianfan-composition"},
      {id: "qianfan-8b", name: "qianfan-8b"},
      {id: "qianfan-70b", name: "qianfan-70b"},
      {id: "internvl3-38b", name: "internvl3-38b"},
      {id: "internvl2.5-38b-mpo", name: "internvl2.5-38b-mpo"},
    ];
  } else if (type === "Cohere") {
    return [
      {id: "command-light", name: "command-light"},
      {id: "command", name: "command"},
    ];
  } else if (type === "iFlytek") {
    return [
      {id: "spark-x2", name: "spark-x2"},
      {id: "spark-x1.5", name: "spark-x1.5"},
      {id: "spark4.0-ultra", name: "spark4.0-ultra"},
      {id: "spark-max", name: "spark-max"},
      {id: "spark-max-32k", name: "spark-max-32k"},
      {id: "spark-pro", name: "spark-pro"},
      {id: "spark-pro-128k", name: "spark-pro-128k"},
      {id: "spark-lite", name: "spark-lite"},
    ];
  } else if (type === "ChatGLM") {
    return [
      {id: "glm-3-turbo", name: "glm-3-turbo"},
      {id: "glm-4", name: "glm-4"},
      {id: "glm-4V", name: "glm-4V"},
    ];
  } else if (type === "MiniMax") {
    return [
      {id: "MiniMax-Text-01", name: "MiniMax-Text-01"},
      {id: "abab6.5s-chat", name: "abab6.5s-chat"},
      {id: "abab6.5g-chat", name: "abab6.5g-chat"},
      {id: "abab6.5t-chat", name: "abab6.5t-chat"},
    ];
  } else if (type === "Ollama") {
    return [
      {id: "deepseek-r1:671b", name: "deepseek-r1:671b"},
      {id: "deepseek-r1:1.5b", name: "deepseek-r1-distill-qwen-1.5b"},
      {id: "deepseek-r1:7b", name: "deepseek-r1-distill-qwen-7b"},
      {id: "deepseek-r1:14b", name: "deepseek-r1-distill-qwen-14b"},
      {id: "deepseek-r1:32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1:8b", name: "deepseek-r1-distill-llama-8b"},
      {id: "deepseek-r1:70b", name: "deepseek-r1-distill-llama-70b"},
      {id: "llama3.3:70b", name: "llama3.3:70b"},
      {id: "qwen2.5:7b", name: "qwen2.5:7b"},
      {id: "qwen2.5:14b", name: "qwen2.5:14b"},
      {id: "qwen2.5:32b", name: "qwen2.5:32b"},
      {id: "qwen2.5:72b", name: "qwen2.5:72b"},
      {id: "deepseek-v3:671b", name: "deepseek-v3:671b"},
      {id: "llama3.2:1b", name: "llama3.2:1b"},
      {id: "llama3.2:3b", name: "llama3.2:3b"},
      {id: "llama3:8b", name: "llama3:8b"},
      {id: "llama3:70b", name: "llama3:70b"},
    ];
  } else if (type === "Local") {
    return [
      {id: "custom-model", name: "custom-model"},
    ];
  } else if (type === "Moonshot") {
    return [
      {id: "kimi-k2-0905-preview", name: "kimi-k2-0905-preview"},
      {id: "kimi-k2-0711-preview", name: "kimi-k2-0711-preview"},
      {id: "kimi-k2-turbo-preview", name: "kimi-k2-turbo-preview"},
      {id: "kimi-k2-thinking", name: "kimi-k2-thinking"},
      {id: "kimi-k2-thinking-turbo", name: "kimi-k2-thinking-turbo"},
      {id: "kimi-latest", name: "kimi-latest (Auto Tier)"},
      {id: "kimi-for-coding", name: "kimi-for-coding (Kimi Coding Plan)"},
      {id: "moonshot-v1-128k", name: "moonshot-v1-128k"},
      {id: "moonshot-v1-32k", name: "moonshot-v1-32k"},
      {id: "moonshot-v1-8k", name: "moonshot-v1-8k"},
    ];
  } else if (type === "Amazon Bedrock") {
    return [
      {id: "claude", name: "Claude"},
      {id: "claude-instant", name: "Claude Instant"},
      {id: "command", name: "Command"},
      {id: "command-light", name: "Command Light"},
      {id: "embed-english", name: "Embed - English"},
      {id: "embed-multilingual", name: "Embed - Multilingual"},
      {id: "jurassic-2-mid", name: "Jurassic-2 Mid"},
      {id: "jurassic-2-ultra", name: "Jurassic-2 Ultra"},
      {id: "llama-2-chat-13b", name: "Llama 2 Chat (13B)"},
      {id: "llama-2-chat-70b", name: "Llama 2 Chat (70B)"},
      {id: "titan-text-lite", name: "Titan Text Lite"},
      {id: "titan-text-express", name: "Titan Text Express"},
      {id: "titan-embeddings", name: "Titan Embeddings"},
      {id: "titan-multimodal-embeddings", name: "Titan Multimodal Embeddings"},
    ];
  } else if (type === "Alibaba Cloud") {
    return [
      {id: "qwen3.6-plus", name: "qwen3.6-plus"},
      {id: "qwen3.6-flash", name: "qwen3.6-flash"},
      {id: "qwen3-vl-plus", name: "qwen3-vl-plus"},
      {id: "qwen3-vl-flash", name: "qwen3-vl-flash"},
      {id: "qvq-max", name: "qvq-max"},
      {id: "qvq-plus", name: "qvq-plus"},
      {id: "qwen-vl-max", name: "qwen-vl-max"},
      {id: "qwen-vl-plus", name: "qwen-vl-plus"},
      {id: "qwen3-235b-a22b", name: "qwen3-235b-a22b"},
      {id: "qwen3-32b", name: "qwen3-32b"},
      {id: "qwen-max", name: "qwen-max"},
      {id: "qwen-max-longcontext", name: "qwen-max-longcontext"},
      {id: "qwen-plus", name: "qwen-plus"},
      {id: "qwen-turbo", name: "qwen-turbo"},
      {id: "qwen-long", name: "qwen-long"},
      {id: "deepseek-r1", name: "deepseek-r1"},
      {id: "deepseek-v3", name: "deepseek-v3"},
      {id: "deepseek-v3.1", name: "deepseek-v3.1"},
      {id: "deepseek-v3.2", name: "deepseek-v3.2"},
      {id: "deepseek-r1-distill-qwen-1.5b", name: "deepseek-r1-distill-qwen-1.5b"},
      {id: "deepseek-r1-distill-qwen-7b", name: "deepseek-r1-distill-qwen-7b"},
      {id: "deepseek-r1-distill-qwen-14b ", name: "deepseek-r1-distill-qwen-14b "},
      {id: "deepseek-r1-distill-qwen-32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1-distill-llama-8b", name: "deepseek-r1-distill-llama-8b"},
      {id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b"},
      // Wanxiang image generation models
      {id: "wanx2.1-t2i-turbo", name: "wanx2.1-t2i-turbo"},
      {id: "wanx2.1-t2i-plus", name: "wanx2.1-t2i-plus"},
      {id: "wanx-v1", name: "wanx-v1"},
    ];
  } else if (type === "Baichuan") {
    return [
      {id: "Baichuan2-Turbo", name: "Baichuan2-Turbo"},
      {id: "Baichuan2-53B", name: "Baichuan2-53B"},
      {id: "Baichuan3-Turbo", name: "Baichuan3-Turbo"},
      {id: "Baichuan3-Turbo-128k", name: "Baichuan3-Turbo-128k"},
      {id: "Baichuan4", name: "Baichuan4"},
      {id: "Baichuan4-Air", name: "Baichuan4-Air"},
      {id: "Baichuan4-Turbo", name: "Baichuan4-Turbo"},
    ];
  } else if (type === "Volcano Engine") {
    return [
      // Seed 2.0 series
      {id: "doubao-seed-2-0-pro-260215", name: "doubao-seed-2-0-pro-260215"},
      {id: "doubao-seed-2-0-lite-260215", name: "doubao-seed-2-0-lite-260215"},
      {id: "doubao-seed-2-0-mini-260215", name: "doubao-seed-2-0-mini-260215"},
      {id: "doubao-seed-2-0-code-preview-260215", name: "doubao-seed-2-0-code-preview-260215"},
      // Seed 1.8
      {id: "doubao-seed-1-8-251228", name: "doubao-seed-1-8-251228"},
      // Seed character & code
      {id: "doubao-seed-character-251128", name: "doubao-seed-character-251128"},
      {id: "doubao-seed-code-preview-251028", name: "doubao-seed-code-preview-251028"},
      // Seed 1.6 series
      {id: "doubao-seed-1-6-251015", name: "doubao-seed-1-6-251015"},
      {id: "doubao-seed-1-6-lite-251015", name: "doubao-seed-1-6-lite-251015"},
      {id: "doubao-seed-1-6-flash-250828", name: "doubao-seed-1-6-flash-250828"},
      {id: "doubao-seed-1-6-vision-250815", name: "doubao-seed-1-6-vision-250815"},
      {id: "doubao-seed-translation-250915", name: "doubao-seed-translation-250915"},
      // Doubao 1.5 series
      {id: "doubao-1-5-pro-32k-250115", name: "doubao-1-5-pro-32k-250115"},
      {id: "doubao-1-5-pro-32k-character-250715", name: "doubao-1-5-pro-32k-character-250715"},
      {id: "doubao-1-5-lite-32k-250115", name: "doubao-1-5-lite-32k-250115"},
      {id: "doubao-1-5-vision-pro-32k-250115", name: "doubao-1-5-vision-pro-32k-250115"},
      // GLM model
      {id: "glm-4-7-251222", name: "glm-4-7-251222"},
      // DeepSeek models
      {id: "deepseek-v3-2-251201", name: "deepseek-v3-2-251201"},
      {id: "deepseek-v3-1-terminus", name: "deepseek-v3-1-terminus"},
      {id: "deepseek-v3-250324", name: "deepseek-v3-250324"},
      {id: "deepseek-r1-250528", name: "deepseek-r1-250528"},
      // Embedding models
      {id: "doubao-embedding-vision-251215", name: "doubao-embedding-vision-251215"},
      // Video generation models
      {id: "doubao-seedance-2-0-260128", name: "doubao-seedance-2-0-260128"},
      {id: "doubao-seedance-2-0-fast-260128", name: "doubao-seedance-2-0-fast-260128"},
      {id: "doubao-seedance-1-5-pro-251215", name: "doubao-seedance-1-5-pro-251215"},
      {id: "doubao-seedance-1-0-pro-250528", name: "doubao-seedance-1-0-pro-250528"},
      {id: "doubao-seedance-1-0-pro-fast-251015", name: "doubao-seedance-1-0-pro-fast-251015"},
      {id: "doubao-seedance-1-0-lite-t2v-250428", name: "doubao-seedance-1-0-lite-t2v-250428"},
      {id: "doubao-seedance-1-0-lite-i2v-250428", name: "doubao-seedance-1-0-lite-i2v-250428"},
      // Image generation models
      {id: "doubao-seedream-5-0-260128", name: "doubao-seedream-5-0-260128"},
      {id: "doubao-seedream-5-0-lite-260128", name: "doubao-seedream-5-0-lite-260128"},
      {id: "doubao-seedream-4-5-251128", name: "doubao-seedream-4-5-251128"},
      {id: "doubao-seedream-4-0-250828", name: "doubao-seedream-4-0-250828"},
      {id: "doubao-seedream-3-0-t2i-250415", name: "doubao-seedream-3-0-t2i-250415"},
    ];
  } else if (type === "DeepSeek") {
    return [
      {id: "deepseek-v4-pro", name: "deepseek-v4-pro"},
      {id: "deepseek-v4-flash", name: "deepseek-v4-flash"},
      {id: "deepseek-chat", name: "deepseek-chat"},
      {id: "deepseek-reasoner", name: "deepseek-reasoner"},
    ];
  } else if (type === "StepFun") {
    return [
      {id: "step-1-8k", name: "step-1-8k"},
      {id: "step-1-32k", name: "step-1-32k"},
      {id: "step-1-256k", name: "step-1-256k"},
      {id: "step-2-mini", name: "step-2-mini"},
      {id: "step-2-16k", name: "step-2-16k"},
      {id: "step-2-16k-exp", name: "step-2-16k-exp"},
    ];
  } else if (type === "Tencent Cloud") {
    return [
      {id: "hunyuan-lite", name: "hunyuan-lite"},
      {id: "hunyuan-standard", name: "hunyuan-standard"},
      {id: "hunyuan-standard-256K", name: "hunyuan-standard-256K"},
      {id: "hunyuan-pro", name: "hunyuan-pro"},
      {id: "hunyuan-code", name: " hunyuan-code"},
      {id: "hunyuan-role", name: "hunyuan-role"},
      {id: "hunyuan-turbo", name: "hunyuan-turbo"},
      {id: "deepseek-r1", name: "deepseek-r1"},
      {id: "deepseek-v3", name: "deepseek-v3"},
      {id: "deepseek-r1-distill-qwen-1.5b", name: "deepseek-r1-distill-qwen-1.5b"},
      {id: "deepseek-r1-distill-qwen-7b", name: "deepseek-r1-distill-qwen-7b"},
      {id: "deepseek-r1-distill-qwen-14b", name: "deepseek-r1-distill-qwen-14b"},
      {id: "deepseek-r1-distill-qwen-32b", name: "deepseek-r1-distill-qwen-32b"},
      {id: "deepseek-r1-distill-llama-8b", name: "deepseek-r1-distill-llama-8b"},
      {id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b"},
    ];
  } else if (type === "Mistral") {
    return [
      {id: "mistral-large-latest", name: "mistral-large-latest"},
      {id: "pixtral-large-latest", name: "pixtral-large-latest"},
      {id: "mistral-small-latest", name: "mistral-small-latest"},
      {id: "codestral-latest", name: "codestral-latest"},
      {id: "ministral-8b-latest", name: "ministral-8b-latest"},
      {id: "ministral-3b-latest", name: "ministral-3b-latest"},
      {id: "pixtral-12b", name: "pixtral-12b"},
      {id: "mistral-nemo", name: "mistral-nemo"},
      {id: "open-mistral-7b", name: "open-mistral-7b"},
      {id: "open-mixtral-8x7b", name: "open-mixtral-8x7b"},
      {id: "open-mixtral-8x22b", name: "open-mixtral-8x22b"},
    ];
  } else if (type === "Yi") {
    return [
      {id: "yi-lightning", name: "yi-lightning"},
      {id: "yi-vision-v2", name: "yi-vision-v2"},
    ];
  } else if (type === "Silicon Flow") {
    return [
      {id: "deepseek-ai/DeepSeek-R1", name: "deepseek-ai/DeepSeek-R1"},
      {id: "deepseek-ai/DeepSeek-V3", name: "deepseek-ai/DeepSeek-V3"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B", name: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B", name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Llama-8B", name: "deepseek-ai/DeepSeek-R1-Distill-Llama-8B"},
      {id: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B"},
      {id: "deepseek-ai/DeepSeek-V2.5", name: "deepseek-ai/DeepSeek-V2.5"},
      {id: "meta-llama/Llama-3.3-70B-Instruct", name: "meta-llama/Llama-3.3-70B-Instruct"},
      {id: "meta-llama/Meta-Llama-3.1-405B-Instruct", name: "meta-llama/Meta-Llama-3.1-405B-Instruct"},
      {id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "meta-llama/Meta-Llama-3.1-70B-Instruct"},
      {id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "meta-llama/Meta-Llama-3.1-8B-Instruct"},
      {id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen/Qwen2.5-72B-Instruct"},
      {id: "Qwen/Qwen2.5-32B-Instruct", name: "Qwen/Qwen2.5-32B-Instruct"},
      {id: "Qwen/Qwen2.5-14B-Instruct", name: "Qwen/Qwen2.5-14B-Instruct"},
      {id: "Qwen/Qwen2.5-7B-Instruct", name: "Qwen/Qwen2.5-7B-Instruct"},
      {id: "THUDM/glm-4-9b-chat", name: "THUDM/glm-4-9b-chat"},
      {id: "01-ai/Yi-1.5-34B-Chat-16K", name: "01-ai/Yi-1.5-34B-Chat-16K"},
      {id: "01-ai/Yi-1.5-9B-Chat-16K", name: "01-ai/Yi-1.5-9B-Chat-16K"},
      {id: "google/gemma-2-27b-it", name: "google/gemma-2-27b-it"},
      {id: "google/gemma-2-9b-it", name: "google/gemma-2-9b-it"},
    ];
  } else if (type === "Grok") {
    return [
      {id: "grok-3-latest", name: "grok-3-latest"},
      {id: "grok-3-fast-latest", name: "grok-3-fast-latest"},
      {id: "grok-3-mini-latest", name: "grok-3-mini-latest"},
      {id: "grok-2-vision-latest", name: "grok-2-vision-latest"},
      {id: "grok-2-latest", name: "grok-2-latest"},
      {id: "grok-2-image-latest", name: "grok-2-image-latest"},
    ];
  } else if (type === "Writer") {
    return [
      {id: "palmyra-x5", name: "Palmyra X5"},
      {id: "palmyra-x4", name: "Palmyra X4"},
      {id: "palmyra-med", name: "Palmyra Med"},
      {id: "palmyra-fin", name: "Palmyra Fin"},
      {id: "palmyra-creative", name: "Palmyra Creative"},
    ];
  } else {
    return [];
  }
}

export function getEmbeddingSubTypeOptions(type) {
  if (type === "OpenAI" || type === "Azure") {
    return openaiEmbeddings;
  } else if (type === "Gemini") {
    return [
      {id: "embedding-001", name: "embedding-001"},
    ];
  } else if (type === "Hugging Face") {
    return [
      {id: "sentence-transformers/all-MiniLM-L6-v2", name: "sentence-transformers/all-MiniLM-L6-v2"},
    ];
  } else if (type === "Cohere") {
    return [
      {id: "embed-english-v2.0", name: "embed-english-v2.0"},
      {id: "embed-english-light-v2.0", name: "embed-english-light-v2.0"},
      {id: "embed-multilingual-v2.0", name: "embed-multilingual-v2.0"},
      {id: "embed-english-v3.0", name: "embed-english-v3.0"},
    ];
  } else if (type === "MiniMax") {
    return [
      {id: "embo-01", name: "embo-01"},
    ];
  } else if (type === "Ollama") {
    return [
      {id: "nomic-embed-text", name: "nomic-embed-text"},
      {id: "mxbai-embed-large", name: "mxbai-embed-large"},
      {id: "snowflake-arctic-embed:335m", name: "snowflake-arctic-embed:335m"},
      {id: "snowflake-arctic-embed:137m", name: "snowflake-arctic-embed:137m"},
      {id: "snowflake-arctic-embed:110m", name: "snowflake-arctic-embed:110m"},
      {id: "snowflake-arctic-embed:33m", name: "snowflake-arctic-embed:33m"},
      {id: "snowflake-arctic-embed:22m", name: "snowflake-arctic-embed:22m"},
      {id: "bge-m3", name: "bge-m3"},
    ];
  } else if (type === "Local") {
    return [
      {id: "custom-embedding", name: "custom-embedding"},
    ];
  } else if (type === "Baidu Cloud") {
    return [
      {id: "Embedding-V1", name: "Embedding-V1"},
      {id: "bge-large-zh", name: "bge-large-zh"},
      {id: "bge-large-en", name: "bge-large-en"},
      {id: "tao-8k", name: "tao-8k"},
    ];
  } else if (type === "Alibaba Cloud") {
    return [
      {id: "text-embedding-v1", name: "text-embedding-v1"},
      {id: "text-embedding-v2", name: "text-embedding-v2"},
      {id: "text-embedding-v3", name: "text-embedding-v3"},
    ];
  } else if (type === "Tencent Cloud") {
    return [
      {id: "hunyuan-embedding", name: "hunyuan-embedding"},
    ];
  } else if (type === "Jina") {
    return [
      {id: "jina-embeddings-v2-base-zh", name: "jina-embeddings-v2-base-zh"},
      {id: "jina-embeddings-v2-base-en", name: "jina-embeddings-v2-base-en"},
      {id: "jina-embeddings-v2-base-de", name: "jina-embeddings-v2-base-de"},
      {id: "jina-embeddings-v2-base-code", name: "jina-embeddings-v2-base-code"},
    ];
  } else if (type === "Word2Vec") {
    return [
      {id: "Word2Vec", name: "Word2Vec"},
    ];
  } else {
    return [];
  }
}

export function getProviderSubTypeOptions(category, type) {
  if (category === "Model") {
    return getModelSubTypeOptions(type);
  } else if (category === "Embedding") {
    return getEmbeddingSubTypeOptions(type);
  } else if (category === "Tool") {
    if (type === "time") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "web_search") {
      return [
        {id: "DuckDuckGo", name: "DuckDuckGo"},
        {id: "Bing", name: "Bing"},
        {id: "Google", name: "Google"},
        {id: "Baidu", name: "Baidu"},
      ];
    } else if (type === "shell") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "local_file") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "office") {
      return [
        {id: "All", name: "All"},
        {id: "Word Read", name: "Word Read"},
        {id: "Word Write", name: "Word Write"},
        {id: "Excel Read", name: "Excel Read"},
        {id: "Excel Write", name: "Excel Write"},
        {id: "PowerPoint Read", name: "PowerPoint Read"},
        {id: "PowerPoint Write", name: "PowerPoint Write"},
      ];
    } else if (type === "web_fetch") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "web_browser") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "gui") {
      return [
        {id: "Windows UIA", name: "Windows UIA"},
      ];
    } else if (type === "video_download") {
      return [
        {id: "Default", name: "Default"},
      ];
    } else if (type === "browser_use") {
      return [
        {id: "Default", name: "Default"},
      ];
    }
    return [];
  } else if (category === "Text-to-Speech") {
    if (type === "Alibaba Cloud") {
      return [
        {id: "cosyvoice-v1", name: "cosyvoice-v1"},
      ];
    } else {
      return [];
    }
  } else if (category === "Speech-to-Text") {
    if (type === "Alibaba Cloud") {
      return [
        {id: "paraformer-realtime-v1", name: "paraformer-realtime-v1"},
      ];
    } else {
      return [];
    }
  }
  return [];
}

export function getProviderAzureApiVersionOptions() {
  return ([
    {id: "", name: ""},
    {id: "2023-03-15-preview", name: "2023-03-15-preview"},
    {id: "2023-05-15", name: "2023-05-15"},
    {id: "2023-06-01-preview", name: "2023-06-01-preview"},
    {id: "2023-07-01-preview", name: "2023-07-01-preview"},
    {id: "2023-08-01-preview", name: "2023-08-01-preview"},
  ]);
}

export function getQuickSetupModelTypes() {
  return ["OpenAI", "Claude", "Gemini", "DeepSeek", "Grok", "Ollama", "OpenRouter", "Mistral", "Azure", "OpenAI Compatible", "Alibaba Cloud", "Moonshot", "Silicon Flow", "Volcano Engine", "Baidu Cloud", "Amazon Bedrock", "OpenCode"];
}

export function getModelProviderMetadata(type) {
  const metadata = {
    "OpenAI": {desc: "GPT-5.5, GPT-4.1, o3...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "gpt-5.5"},
    "Claude": {desc: "Claude Opus, Sonnet...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "claude-opus-4-7"},
    "Gemini": {desc: "Gemini 2.5 Pro, Flash...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "gemini-2.5-pro"},
    "DeepSeek": {desc: "DeepSeek-V4, R1...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "deepseek-v4-pro"},
    "Grok": {desc: "Grok-3, Grok-2...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "grok-3-latest"},
    "Ollama": {desc: "Run models locally", needsApiKey: false, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "deepseek-r1:671b", urlPlaceholder: "http://localhost:11434", defaultUrl: "http://localhost:11434"},
    "OpenRouter": {desc: "100+ models unified", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "anthropic/claude-opus-4-7"},
    "Mistral": {desc: "Mistral Large, Medium...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "mistral-large-latest"},
    "Azure": {desc: "Azure-hosted GPT models", needsApiKey: true, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "gpt-5.5", urlPlaceholder: "https://your-resource.openai.azure.com"},
    "OpenAI Compatible": {desc: "Any compatible API", needsApiKey: true, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "", urlPlaceholder: "https://api.example.com/v1"},
    "Alibaba Cloud": {desc: "Qwen3, Qwen-Max...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "qwen3-235b-a22b"},
    "Moonshot": {desc: "Kimi K2, long-context models", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "kimi-k2-0905-preview"},
    "Silicon Flow": {desc: "DeepSeek, Qwen, and more", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "deepseek-ai/DeepSeek-R1"},
    "Volcano Engine": {desc: "ByteDance AI platform", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "doubao-seed-2-0-pro-260215"},
    "Baidu Cloud": {desc: "ERNIE Bot models", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "ernie-5.0"},
    "Amazon Bedrock": {desc: "Claude, Llama on AWS", needsApiKey: true, needsUrl: false, needsClientId: true, needsRegion: true, defaultSubType: "claude"},
    "OpenCode": {desc: "Delegate coding to OpenCode agent", needsApiKey: false, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "", urlPlaceholder: "http://localhost:4096", defaultUrl: "http://localhost:4096"},
  };
  return metadata[type] || {desc: "", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: ""};
}

export function getPipeTypeOptions() {
  return [
    {id: "Telegram", name: "Telegram"},
    {id: "Discord", name: "Discord"},
    {id: "WhatsApp", name: "WhatsApp"},
    {id: "Slack", name: "Slack"},
    {id: "Facebook Messenger", name: "Facebook Messenger"},
    {id: "Threads", name: "Threads"},
    {id: "WeChat", name: "WeChat"},
    {id: "Snapchat", name: "Snapchat"},
    {id: "X Direct Messages", name: "X Direct Messages"},
  ];
}

export function getPipePlatformMetadata(type) {
  const metadata = {
    "Telegram": {desc: "Connect via Telegram bot", tokenLabel: "Bot Token", tokenPlaceholder: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz", helpUrl: "https://core.telegram.org/bots#how-do-i-create-a-bot"},
    "Discord": {desc: "Connect via Discord bot", tokenLabel: "Bot Token", tokenPlaceholder: "MTxxxxxx.Gyyyyy.zzzzzzzzzzz", helpUrl: "https://discord.com/developers/applications"},
    "WhatsApp": {desc: "Connect via WhatsApp Business", tokenLabel: "Access Token", tokenPlaceholder: "EAAxxxxxxxx...", helpUrl: "https://developers.facebook.com/docs/whatsapp"},
    "Slack": {desc: "Connect via Slack bot", tokenLabel: "Bot Token", tokenPlaceholder: "xoxb-...", helpUrl: "https://api.slack.com/apps"},
    "Facebook Messenger": {desc: "Connect via Facebook Messenger", tokenLabel: "Page Access Token", tokenPlaceholder: "EAAxxxxxxxx...", helpUrl: "https://developers.facebook.com/docs/messenger-platform"},
    "Threads": {desc: "Connect via Meta Threads", tokenLabel: "User Access Token", tokenPlaceholder: "THRDSxxxxxxxx...", helpUrl: "https://developers.facebook.com/docs/threads"},
    "WeChat": {desc: "Connect via WeChat Official Account", tokenLabel: "Access Token", tokenPlaceholder: "your-access-token", helpUrl: "https://developers.weixin.qq.com"},
    "Snapchat": {desc: "Connect via Snapchat Kit Bot", tokenLabel: "Access Token", tokenPlaceholder: "your-oauth-access-token", helpUrl: "https://kit.snapchat.com/"},
    "X Direct Messages": {desc: "Connect via X Direct Messages", tokenLabel: "OAuth Token", tokenPlaceholder: "your-oauth-token", helpUrl: "https://developer.x.com"},
  };
  return metadata[type] || {desc: "", tokenLabel: "Token", tokenPlaceholder: "", helpUrl: ""};
}

export function isImageGenerationModelProvider(provider) {
  if (!provider || provider.category !== "Model") {
    return false;
  }
  const subType = (provider.subType || "").trim();
  const type = provider.type || "";
  const lower = subType.toLowerCase();

  if (type === "OpenAI" || type === "Azure") {
    if (lower.startsWith("gpt-image") || lower.includes("dall-e")) {
      return true;
    }
  }
  if (type === "Gemini") {
    if (lower.includes("imagen-") || lower === "gemini-2.5-flash-image" ||
        lower.includes("gemini-3.1-flash-image") || lower.includes("gemini-3-pro-image")) {
      return true;
    }
  }
  if (type === "Alibaba Cloud") {
    if (lower.includes("wanx") && (lower.includes("t2i") || lower.includes("wanx-v"))) {
      return true;
    }
  }
  if (type === "Volcano Engine") {
    if (lower.includes("seedream")) {
      return true;
    }
  }
  if (type === "Grok") {
    if (lower.includes("grok-2-image") || lower === "grok-2-image-latest") {
      return true;
    }
  }
  if (lower.includes("dall-e") || lower.startsWith("gpt-image")) {
    return true;
  }
  if (lower.includes("imagen-") && lower.includes("generate")) {
    return true;
  }
  if (lower.includes("seedream")) {
    return true;
  }
  if (lower.includes("wanx") && (lower.includes("t2i") || lower.includes("wanx-v"))) {
    return true;
  }
  if (/(^|-)image(-|preview)/i.test(subType) && !lower.includes("embedding") && type === "Gemini") {
    return true;
  }
  return false;
}

export function getThinkingModelMaxTokens(subType) {
  if (subType.includes("claude")) {
    if (subType.includes("4")) {
      if (subType.includes("sonnet")) {
        return 64000;
      } else if (subType.includes("opus")) {
        return 32000;
      }
    } else if (subType.includes("3-7") || subType.includes("sonnet")) {
      return 64000;
    }
  }
  return 0;
}
