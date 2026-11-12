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
import {StaticBaseUrl} from "@/Conf";

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
  // GPT-6 series (latest flagship)
  {id: "gpt-6-astra", name: "gpt-6-astra"},
  {id: "gpt-6-astra-pro", name: "gpt-6-astra-pro"},
  // GPT-5.6 series
  {id: "gpt-5.6-sol", name: "gpt-5.6-sol"},
  {id: "gpt-5.6-sol-pro", name: "gpt-5.6-sol-pro"},
  {id: "gpt-5.6-terra", name: "gpt-5.6-terra"},
  {id: "gpt-5.6-terra-pro", name: "gpt-5.6-terra-pro"},
  {id: "gpt-5.6-luna", name: "gpt-5.6-luna"},
  {id: "gpt-5.6-luna-pro", name: "gpt-5.6-luna-pro"},
  // GPT-5.5 series
  {id: "gpt-5.5", name: "gpt-5.5"},
  {id: "gpt-5.5-pro", name: "gpt-5.5-pro"},
  // GPT-5.4 series
  {id: "gpt-5.4", name: "gpt-5.4"},
  {id: "gpt-5.4-pro", name: "gpt-5.4-pro"},
  {id: "gpt-5.4-mini", name: "gpt-5.4-mini"},
  {id: "gpt-5.4-nano", name: "gpt-5.4-nano"},
  // GPT-5.3 / 5.2 / 5.1 codex and chat series
  {id: "gpt-5.3-codex", name: "gpt-5.3-codex"},
  {id: "gpt-5.2", name: "gpt-5.2"},
  {id: "gpt-5.2-pro", name: "gpt-5.2-pro"},
  {id: "gpt-5.2-chat", name: "gpt-5.2-chat"},
  {id: "gpt-5.2-codex", name: "gpt-5.2-codex"},
  {id: "gpt-5.1", name: "gpt-5.1"},
  {id: "gpt-5.1-codex", name: "gpt-5.1-codex"},
  {id: "gpt-5.1-codex-mini", name: "gpt-5.1-codex-mini"},
  {id: "gpt-5.1-codex-max", name: "gpt-5.1-codex-max"},
  // GPT-5 series
  {id: "gpt-5", name: "gpt-5"},
  {id: "gpt-5-mini", name: "gpt-5-mini"},
  {id: "gpt-5-nano", name: "gpt-5-nano"},
  {id: "gpt-5-pro", name: "gpt-5-pro"},
  {id: "gpt-5-search-api", name: "gpt-5-search-api"},
  {id: "chat-latest", name: "chat-latest"},
  // Cybersecurity models
  {id: "gpt-5.6-cyber", name: "gpt-5.6-cyber"},
  {id: "gpt-5.5-cyber", name: "gpt-5.5-cyber"},
  {id: "gpt-daybreak-red-latest", name: "gpt-daybreak-red-latest"},
  {id: "gpt-daybreak-blue-latest", name: "gpt-daybreak-blue-latest"},
  // Life sciences
  {id: "gpt-rosalind-research", name: "gpt-rosalind-research"},
  // o-series reasoning models (latest first)
  {id: "o4-mini", name: "o4-mini"},
  {id: "o3-pro", name: "o3-pro"},
  {id: "o3", name: "o3"},
  {id: "o3-mini", name: "o3-mini"},
  {id: "o1-pro", name: "o1-pro"},
  {id: "o1", name: "o1"},
  // GPT-4.1 series
  {id: "gpt-4.1", name: "gpt-4.1"},
  {id: "gpt-4.1-mini", name: "gpt-4.1-mini"},
  {id: "gpt-4.1-nano", name: "gpt-4.1-nano"},
  // GPT-4o series
  {id: "gpt-4o", name: "gpt-4o"},
  {id: "gpt-4o-2024-08-06", name: "gpt-4o-2024-08-06"},
  {id: "gpt-4o-mini", name: "gpt-4o-mini"},
  {id: "gpt-4o-mini-2024-07-18", name: "gpt-4o-mini-2024-07-18"},
  // GPT-4 series (legacy)
  {id: "gpt-4-turbo", name: "gpt-4-turbo"},
  {id: "gpt-4", name: "gpt-4"},
  // Open-weight
  {id: "gpt-oss-120b", name: "gpt-oss-120b"},
  {id: "gpt-oss-20b", name: "gpt-oss-20b"},
  {id: "gpt-oss-safeguard-120b", name: "gpt-oss-safeguard-120b"},
  {id: "gpt-oss-safeguard-20b", name: "gpt-oss-safeguard-20b"},
  // GPT-3.5 (legacy)
  {id: "gpt-3.5-turbo", name: "gpt-3.5-turbo"},
  // Image generation models (latest first)
  {id: "gpt-image-2.5-sunburst", name: "gpt-image-2.5-sunburst"},
  {id: "gpt-image-2.5-flare", name: "gpt-image-2.5-flare"},
  {id: "gpt-image-2", name: "gpt-image-2"},
  {id: "gpt-image-1.5", name: "gpt-image-1.5"},
  {id: "gpt-image-1", name: "gpt-image-1"},
  {id: "gpt-image-1-mini", name: "gpt-image-1-mini"},
  {id: "chatgpt-image-latest", name: "chatgpt-image-latest"},
];

const openaiEmbeddings = [
  {id: "text-embedding-ada-002", name: "text-embedding-ada-002"},
  {id: "text-embedding-3-small", name: "text-embedding-3-small"},
  {id: "text-embedding-3-large", name: "text-embedding-3-large"},
];

export function getProviderLogoURL(provider) {
  const otherProviderInfo = getOtherProviderInfo();
  if (!provider) {
    return "";
  }
  const type = provider.category === "Chat" && provider.type === "Weixin Claw" ? "WeChat" : provider.type;
  if (!otherProviderInfo[provider.category] || !otherProviderInfo[provider.category][type]) {
    return "";
  }

  return otherProviderInfo[provider.category][type].logo;
}

export function isProviderSupportWebSearch(provider) {
  if (!provider || provider.category !== "Model") {
    return false;
  }

  if (provider.type === "OpenAI") {
    return true;
  }

  if (provider.type === "Alibaba Cloud") {
    // Wan / Qwen-Image generation models do not support web search
    if (provider.subType && isAlibabaImageGenerationModel(provider.subType.toLowerCase())) {
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
        {id: "Mistral", name: "Mistral"},
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
  if (type === "Alibaba Cloud" && subType === "cosyvoice-v2") {
    return [
      {id: "longwan_v2", name: "龙婉，女，中文普通话。龙婉声音温柔甜美，富有亲和力，给人温暖陪伴感。"},
      {id: "longcheng_v2", name: "龙橙，男，中文普通话。龙橙声音温柔清澈，富有亲和力，是邻家的温暖大哥哥。"},
      {id: "longhua_v2", name: "龙华，女童，中文普通话。龙华声音活泼可爱，有趣生动，是孩子们的好朋友。"},
      {id: "longxiaochun_v2", name: "龙小淳，女，中英双语。龙小淳的嗓音如丝般柔滑，温暖中流淌着亲切与抚慰，恰似春风吹过心田。"},
      {id: "longxiaoxia_v2", name: "龙小夏，女，中文普通话。龙小夏以温润磁性的声线，宛如夏日细雨，悄然滋润听者心灵，营造恬静氛围。"},
      {id: "longxiaocheng_v2", name: "龙小诚，男，中英双语。龙小诚深邃而稳重的嗓音，犹如醇厚佳酿，散发出成熟魅力。"},
      {id: "longxiaobai_v2", name: "龙小白，女，中文普通话。龙小白以轻松亲和的声调，演绎闲适日常，其嗓音如邻家女孩般亲切自然。"},
      {id: "longlaotie_v2", name: "龙老铁，男，东北口音。龙老铁以纯正东北腔，豪爽直率，幽默风趣，为讲述增添浓郁地方特色与生活气息。"},
      {id: "longshu_v2", name: "龙书，男，中文普通话。龙书以专业、沉稳的播报风格，传递新闻资讯，其嗓音富含权威与信赖感。"},
      {id: "longjing_v2", name: "龙婧，女，中文普通话。龙婧的嗓音庄重而凛然，精准传达严肃主题，赋予话语以权威与力量。"},
      {id: "longmiao_v2", name: "龙妙，女，中文普通话。龙妙声音清澈透亮，优雅如泉水叮咚，赋予朗诵空灵之美，令人陶醉其中。"},
      {id: "longyue_v2", name: "龙悦，女，中文普通话。龙悦以抑扬顿挫、韵味十足的评书腔调，生动讲述故事，引领听众步入传奇世界！"},
      {id: "longyuan_v2", name: "龙媛，女，中文普通话。龙媛以细腻入微、情感丰富的嗓音，将小说人物与情节娓娓道来，引人入胜。"},
      {id: "longfei_v2", name: "龙飞，男，中文普通话。龙飞以冷静而睿智的声线，如高山上的清泉，经久流长，透出庄严的宁静。"},
      {id: "longjielidou_v2", name: "龙杰力豆，儿童，中英双语。龙杰力豆以和煦如春阳的童声娓娓道来，透出了欣欣向荣的生命力，温暖每一个倾听的耳朵。"},
      {id: "longshuo_v2", name: "龙硕，男，中文普通话。龙硕嗓音充满活力与阳光，如暖阳照耀，增添无限正能量，使人精神焕发。"},
      {id: "longke_v2", name: "龙可，女童，中文普通话。龙可声音天真乖巧，童趣十足。"},
      {id: "longsanshu", name: "龙三叔，男，中文普通话。龙三叔声音沉稳有质感，娓娓道来。"},
      {id: "loongstella_v2", name: "Stella2.0，女，中英双语。Stella2.0以其飒爽利落的嗓音，演绎独立女性风采，展现坚韧与力量之美。"},
      {id: "loongbella_v2", name: "Bella2.0，女，中文普通话。Bella2.0以精准干练的播报风格，传递全球资讯，其专业女声犹如新闻现场的引导者。"},
    ];
  }

  return [];
}

export function getModelSubTypeOptions(type) {
  if (type === "OpenAI" || type === "Azure" || type === "OpenAI Compatible") {
    return openaiModels;
  } else if (type === "Gemini") {
    return [
      // Gemini 3.x Flash series (Stable)
      {id: "gemini-3.8-flash", name: "gemini-3.8-flash"},
      {id: "gemini-3.8-live", name: "gemini-3.8-live"},
      {id: "gemini-3.8-live-extended-thinking", name: "gemini-3.8-live-extended-thinking"},
      {id: "gemini-3.7-flash", name: "gemini-3.7-flash"},
      {id: "gemini-3.6-flash", name: "gemini-3.6-flash"},
      {id: "gemini-3.5-flash", name: "gemini-3.5-flash"},
      {id: "gemini-3.5-flash-lite", name: "gemini-3.5-flash-lite"},
      {id: "gemini-3.1-flash-lite", name: "gemini-3.1-flash-lite"},
      // Gemini 3.x series (Preview)
      {id: "gemini-3.1-pro-preview", name: "gemini-3.1-pro-preview"},
      {id: "gemini-3.1-pro-preview-customtools", name: "gemini-3.1-pro-preview-customtools"},
      {id: "gemini-3-flash-preview", name: "gemini-3-flash-preview"},
      {id: "gemini-3.5-live-translate-preview", name: "gemini-3.5-live-translate-preview"},
      {id: "gemini-3.1-flash-live-preview", name: "gemini-3.1-flash-live-preview"},
      {id: "gemini-3.1-flash-tts-preview", name: "gemini-3.1-flash-tts-preview"},
      {id: "gemini-omni-1.1-flash", name: "gemini-omni-1.1-flash"},
      // Gemini 2.5 series (Stable)
      {id: "gemini-2.5-pro", name: "gemini-2.5-pro"},
      {id: "gemini-2.5-flash", name: "gemini-2.5-flash"},
      {id: "gemini-2.5-flash-lite", name: "gemini-2.5-flash-lite"},
      // Gemini 2.5 series (Preview)
      {id: "gemini-2.5-flash-native-audio-preview-12-2025", name: "gemini-2.5-flash-native-audio-preview-12-2025"},
      {id: "gemini-2.5-flash-preview-tts", name: "gemini-2.5-flash-preview-tts"},
      {id: "gemini-2.5-pro-preview-tts", name: "gemini-2.5-pro-preview-tts"},
      {id: "gemini-2.5-computer-use-preview-10-2025", name: "gemini-2.5-computer-use-preview-10-2025"},
      // Image generation models
      {id: "gemini-3.1-flash-image", name: "gemini-3.1-flash-image"},
      {id: "gemini-3.1-flash-lite-image", name: "gemini-3.1-flash-lite-image"},
      {id: "gemini-3-pro-image", name: "gemini-3-pro-image"},
      {id: "gemini-2.5-flash-image", name: "gemini-2.5-flash-image"},
      // Transcription models
      {id: "gemini-3.5-transcribe", name: "gemini-3.5-transcribe"},
      {id: "gemini-3.5-transcribe-live", name: "gemini-3.5-transcribe-live"},
      // Embedding models
      {id: "gemini-embedding-2-preview", name: "gemini-embedding-2-preview"},
      {id: "gemini-embedding-001", name: "gemini-embedding-001"},
      // Specialized models
      {id: "deep-research-preview-04-2026", name: "deep-research-preview-04-2026"},
      {id: "deep-research-max-preview-04-2026", name: "deep-research-max-preview-04-2026"},
      {id: "antigravity-preview-05-2026", name: "antigravity-preview-05-2026"},
      {id: "gemini-robotics-er-2-preview", name: "gemini-robotics-er-2-preview"},
      {id: "gemini-robotics-er-1.6-preview", name: "gemini-robotics-er-1.6-preview"},
      // Video generation models
      {id: "veo-3.1-generate-preview", name: "veo-3.1-generate-preview"},
      {id: "veo-3.1-lite-generate-preview", name: "veo-3.1-lite-generate-preview"},
      // Music generation models
      {id: "lyria-3.5", name: "lyria-3.5"},
      {id: "lyria-3-pro-preview", name: "lyria-3-pro-preview"},
      {id: "lyria-3-clip-preview", name: "lyria-3-clip-preview"},
      {id: "lyria-realtime-exp", name: "lyria-realtime-exp"},
    ];
  } else if (type === "Hugging Face") {
    return [
      {id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct", name: "meta-llama/Llama-4-Maverick-17B-128E-Instruct"},
      {id: "meta-llama/Llama-4-Scout-17B-16E-Instruct", name: "meta-llama/Llama-4-Scout-17B-16E-Instruct"},
      {id: "meta-llama/Llama-3.3-70B-Instruct", name: "meta-llama/Llama-3.3-70B-Instruct"},
      {id: "deepseek-ai/DeepSeek-V3.2", name: "deepseek-ai/DeepSeek-V3.2"},
      {id: "deepseek-ai/DeepSeek-R1", name: "deepseek-ai/DeepSeek-R1"},
      {id: "Qwen/Qwen3-235B-A22B-Instruct-2507", name: "Qwen/Qwen3-235B-A22B-Instruct-2507"},
      {id: "Qwen/Qwen3-32B", name: "Qwen/Qwen3-32B"},
      {id: "zai-org/GLM-4.7", name: "zai-org/GLM-4.7"},
      {id: "moonshotai/Kimi-K2-Thinking", name: "moonshotai/Kimi-K2-Thinking"},
      {id: "MiniMaxAI/MiniMax-M2", name: "MiniMaxAI/MiniMax-M2"},
      {id: "openai/gpt-oss-120b", name: "openai/gpt-oss-120b"},
      {id: "openai/gpt-oss-20b", name: "openai/gpt-oss-20b"},
      {id: "google/gemma-4-31b-it", name: "google/gemma-4-31b-it"},
      {id: "google/gemma-3-27b-it", name: "google/gemma-3-27b-it"},
    ];
  } else if (type === "Claude") {
    return [
      {id: "claude-fable-5-1", name: "claude-fable-5-1"},
      {id: "claude-fable-5", name: "claude-fable-5"},
      {id: "claude-opus-5", name: "claude-opus-5"},
      {id: "claude-opus-4-8", name: "claude-opus-4-8"},
      {id: "claude-opus-4-7", name: "claude-opus-4-7"},
      {id: "claude-opus-4-6", name: "claude-opus-4-6"},
      {id: "claude-sonnet-5", name: "claude-sonnet-5"},
      {id: "claude-sonnet-4-6", name: "claude-sonnet-4-6"},
      {id: "claude-haiku-4-5", name: "claude-haiku-4-5"},
    ];
  } else if (type === "OpenRouter") {
    return [
      {id: "anthropic/claude-fable-5.1", name: "anthropic/claude-fable-5.1"},
      {id: "anthropic/claude-opus-5", name: "anthropic/claude-opus-5"},
      {id: "anthropic/claude-sonnet-5", name: "anthropic/claude-sonnet-5"},
      {id: "anthropic/claude-opus-4.8", name: "anthropic/claude-opus-4.8"},
      {id: "anthropic/claude-haiku-4.5", name: "anthropic/claude-haiku-4.5"},
      {id: "openai/gpt-6-astra", name: "openai/gpt-6-astra"},
      {id: "openai/gpt-5.6-sol", name: "openai/gpt-5.6-sol"},
      {id: "openai/gpt-5.6-terra", name: "openai/gpt-5.6-terra"},
      {id: "openai/gpt-5.6-luna", name: "openai/gpt-5.6-luna"},
      {id: "openai/gpt-5.3-codex", name: "openai/gpt-5.3-codex"},
      {id: "google/gemini-3.8-flash", name: "google/gemini-3.8-flash"},
      {id: "google/gemini-3.1-pro-preview", name: "google/gemini-3.1-pro-preview"},
      {id: "google/gemini-3.5-flash", name: "google/gemini-3.5-flash"},
      {id: "deepseek/deepseek-v4-pro", name: "deepseek/deepseek-v4-pro"},
      {id: "deepseek/deepseek-v4-flash", name: "deepseek/deepseek-v4-flash"},
      {id: "deepseek/deepseek-v4.1-flash", name: "deepseek/deepseek-v4.1-flash"},
      {id: "x-ai/grok-4.6", name: "x-ai/grok-4.6"},
      {id: "x-ai/grok-4.5", name: "x-ai/grok-4.5"},
      {id: "x-ai/grok-4.3", name: "x-ai/grok-4.3"},
      {id: "qwen/qwen3.8-max-0902", name: "qwen/qwen3.8-max-0902"},
      {id: "qwen/qwen3.8-flash", name: "qwen/qwen3.8-flash"},
      {id: "moonshotai/kimi-k3", name: "moonshotai/kimi-k3"},
      {id: "moonshotai/kimi-k2.7-code", name: "moonshotai/kimi-k2.7-code"},
      {id: "z-ai/glm-5.3", name: "z-ai/glm-5.3"},
      {id: "z-ai/glm-5.2", name: "z-ai/glm-5.2"},
      {id: "minimax/minimax-m3", name: "minimax/minimax-m3"},
      {id: "mistralai/mistral-medium-3-5", name: "mistralai/mistral-medium-3-5"},
      {id: "mistralai/mistral-large-2512", name: "mistralai/mistral-large-2512"},
      {id: "meta-llama/llama-4-maverick", name: "meta-llama/llama-4-maverick"},
      {id: "meta-llama/llama-3.3-70b-instruct", name: "meta-llama/llama-3.3-70b-instruct"},
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
      {id: "command-a-plus-05-2026", name: "command-a-plus-05-2026"},
      {id: "command-a-03-2025", name: "command-a-03-2025"},
      {id: "command-a-reasoning-08-2025", name: "command-a-reasoning-08-2025"},
      {id: "command-a-vision-07-2025", name: "command-a-vision-07-2025"},
      {id: "command-a-translate-08-2025", name: "command-a-translate-08-2025"},
      {id: "command-r7b-12-2024", name: "command-r7b-12-2024"},
      {id: "command-r-plus-08-2024", name: "command-r-plus-08-2024"},
      {id: "command-r-08-2024", name: "command-r-08-2024"},
    ];
  } else if (type === "iFlytek") {
    return [
      {id: "spark-x2", name: "spark-x2"},
      {id: "spark-x1.5", name: "spark-x1.5"},
      {id: "spark4.0-ultra", name: "spark4.0-ultra"},
      {id: "spark-pro", name: "spark-pro"},
      {id: "spark-pro-128k", name: "spark-pro-128k"},
      {id: "spark-lite", name: "spark-lite"},
    ];
  } else if (type === "ChatGLM") {
    return [
      // GLM-5 series
      {id: "glm-5.3", name: "glm-5.3"},
      {id: "glm-5.2", name: "glm-5.2"},
      {id: "glm-5.1", name: "glm-5.1"},
      {id: "glm-5", name: "glm-5"},
      {id: "glm-5-turbo", name: "glm-5-turbo"},
      // GLM-4 series
      {id: "glm-4.7", name: "glm-4.7"},
      {id: "glm-4.7-flashx", name: "glm-4.7-flashx"},
      {id: "glm-4.7-flash", name: "glm-4.7-flash"},
      {id: "glm-4.6", name: "glm-4.6"},
      {id: "glm-4.5-air", name: "glm-4.5-air"},
      {id: "glm-4.5-airx", name: "glm-4.5-airx"},
      {id: "glm-4.5-flash", name: "glm-4.5-flash"},
      {id: "glm-4-long", name: "glm-4-long"},
      {id: "glm-4-flashx-250414", name: "glm-4-flashx-250414"},
      {id: "glm-4-flash-250414", name: "glm-4-flash-250414"},
      // Vision models
      {id: "glm-5.3-flash", name: "glm-5.3-flash"},
      {id: "glm-5v-turbo", name: "glm-5v-turbo"},
      {id: "glm-4.6v", name: "glm-4.6v"},
      {id: "glm-4.6v-flash", name: "glm-4.6v-flash"},
      {id: "glm-4.1v-thinking-flashx", name: "glm-4.1v-thinking-flashx"},
      {id: "glm-4.1v-thinking-flash", name: "glm-4.1v-thinking-flash"},
      {id: "glm-4v-flash", name: "glm-4v-flash"},
      {id: "autoglm-phone", name: "autoglm-phone"},
    ];
  } else if (type === "MiniMax") {
    return [
      {id: "MiniMax-M3", name: "MiniMax-M3"},
      {id: "MiniMax-M2.7", name: "MiniMax-M2.7"},
      {id: "MiniMax-M2.7-highspeed", name: "MiniMax-M2.7-highspeed"},
      {id: "MiniMax-M2.5", name: "MiniMax-M2.5"},
      {id: "MiniMax-M2.5-highspeed", name: "MiniMax-M2.5-highspeed"},
      {id: "MiniMax-M2.1", name: "MiniMax-M2.1"},
      {id: "MiniMax-M2.1-highspeed", name: "MiniMax-M2.1-highspeed"},
      {id: "MiniMax-M2", name: "MiniMax-M2"},
      {id: "M2-her", name: "M2-her"},
      {id: "MiniMax-M1", name: "MiniMax-M1"},
      {id: "MiniMax-Text-01", name: "MiniMax-Text-01"},
    ];
  } else if (type === "Ollama") {
    return [
      {id: "deepseek-r1:671b", name: "deepseek-r1:671b"},
      {id: "deepseek-r1:1.5b", name: "deepseek-r1:1.5b"},
      {id: "deepseek-r1:7b", name: "deepseek-r1:7b"},
      {id: "deepseek-r1:8b", name: "deepseek-r1:8b"},
      {id: "deepseek-r1:14b", name: "deepseek-r1:14b"},
      {id: "deepseek-r1:32b", name: "deepseek-r1:32b"},
      {id: "deepseek-r1:70b", name: "deepseek-r1:70b"},
      {id: "qwen3:0.6b", name: "qwen3:0.6b"},
      {id: "qwen3:8b", name: "qwen3:8b"},
      {id: "qwen3:14b", name: "qwen3:14b"},
      {id: "qwen3:32b", name: "qwen3:32b"},
      {id: "qwen3:235b", name: "qwen3:235b"},
      {id: "qwen2.5:7b", name: "qwen2.5:7b"},
      {id: "qwen2.5:14b", name: "qwen2.5:14b"},
      {id: "qwen2.5:32b", name: "qwen2.5:32b"},
      {id: "qwen2.5:72b", name: "qwen2.5:72b"},
      {id: "llama3.3:70b", name: "llama3.3:70b"},
      {id: "llama3.2:1b", name: "llama3.2:1b"},
      {id: "llama3.2:3b", name: "llama3.2:3b"},
      {id: "llama3.1:8b", name: "llama3.1:8b"},
      {id: "llama3.1:70b", name: "llama3.1:70b"},
      {id: "llama3.1:405b", name: "llama3.1:405b"},
      {id: "gemma3:4b", name: "gemma3:4b"},
      {id: "gemma3:12b", name: "gemma3:12b"},
      {id: "gemma3:27b", name: "gemma3:27b"},
      {id: "gemma2:9b", name: "gemma2:9b"},
      {id: "gemma2:27b", name: "gemma2:27b"},
      {id: "mistral:7b", name: "mistral:7b"},
    ];
  } else if (type === "Local") {
    return [
      {id: "custom-model", name: "custom-model"},
    ];
  } else if (type === "Moonshot") {
    return [
      // Kimi open platform
      {id: "kimi-k3", name: "kimi-k3"},
      {id: "kimi-k2.7-code", name: "kimi-k2.7-code"},
      {id: "kimi-k2.7-code-highspeed", name: "kimi-k2.7-code-highspeed"},
      {id: "kimi-k2.6", name: "kimi-k2.6"},
      // Kimi Coding Plan
      {id: "k3", name: "k3 (Kimi Coding Plan)"},
      {id: "k3-256k", name: "k3-256k (Kimi Coding Plan)"},
      {id: "kimi-for-coding", name: "kimi-for-coding (Kimi Coding Plan)"},
      {id: "kimi-for-coding-highspeed", name: "kimi-for-coding-highspeed (Kimi Coding Plan)"},
    ];
  } else if (type === "Amazon Bedrock") {
    // Bedrock sub-types are the model IDs passed straight to InvokeModel / Converse
    return [
      // Anthropic
      {id: "global.anthropic.claude-fable-5-1", name: "Claude Fable 5.1"},
      {id: "global.anthropic.claude-opus-5", name: "Claude Opus 5"},
      {id: "global.anthropic.claude-sonnet-5", name: "Claude Sonnet 5"},
      {id: "global.anthropic.claude-fable-5", name: "Claude Fable 5"},
      {id: "global.anthropic.claude-opus-4-8", name: "Claude Opus 4.8"},
      {id: "global.anthropic.claude-opus-4-7", name: "Claude Opus 4.7"},
      {id: "global.anthropic.claude-sonnet-4-6", name: "Claude Sonnet 4.6"},
      {id: "global.anthropic.claude-haiku-4-5", name: "Claude Haiku 4.5"},
      // OpenAI
      {id: "global.openai.gpt-6-astra", name: "GPT-6 Astra"},
      {id: "global.openai.gpt-5.6-sol", name: "GPT-5.6 Sol"},
      {id: "global.openai.gpt-5.6-terra", name: "GPT-5.6 Terra"},
      {id: "global.openai.gpt-5.6-luna", name: "GPT-5.6 Luna"},
      {id: "openai.gpt-oss-120b", name: "gpt-oss-120b"},
      {id: "openai.gpt-oss-20b", name: "gpt-oss-20b"},
      // Amazon
      {id: "amazon.nova-2-lite-v1:0", name: "Nova 2 Lite"},
      {id: "amazon.nova-premier-v1:0", name: "Nova Premier"},
      {id: "amazon.nova-pro-v1:0", name: "Nova Pro"},
      {id: "amazon.nova-lite-v1:0", name: "Nova Lite"},
      {id: "amazon.nova-micro-v1:0", name: "Nova Micro"},
      // DeepSeek
      {id: "deepseek.v3.2", name: "DeepSeek V3.2"},
      // Mistral AI
      {id: "mistral.mistral-large-3-675b-instruct", name: "Mistral Large 3"},
      // Meta
      {id: "meta.llama3-3-70b-instruct-v1:0", name: "Llama 3.3 70B Instruct"},
      {id: "meta.llama4-maverick-17b-instruct-v1:0", name: "Llama 4 Maverick 17B Instruct"},
      {id: "meta.llama4-scout-17b-instruct-v1:0", name: "Llama 4 Scout 17B Instruct"},
      // Cohere
      {id: "cohere.command-r-plus-v1:0", name: "Command R+"},
      {id: "cohere.command-r-v1:0", name: "Command R"},
    ];
  } else if (type === "Alibaba Cloud") {
    return [
      // Qwen commercial models
      {id: "qwen3.8-max", name: "qwen3.8-max"},
      {id: "qwen3.8-flash", name: "qwen3.8-flash"},
      {id: "qwen3.7-max", name: "qwen3.7-max"},
      {id: "qwen3.7-plus", name: "qwen3.7-plus"},
      {id: "qwen3.7-flash", name: "qwen3.7-flash"},
      {id: "qwen3.6-plus", name: "qwen3.6-plus"},
      {id: "qwen3.6-flash", name: "qwen3.6-flash"},
      {id: "qwen-max", name: "qwen-max"},
      {id: "qwen-plus", name: "qwen-plus"},
      {id: "qwen-flash", name: "qwen-flash"},
      {id: "qwen-long", name: "qwen-long"},
      // Qwen vision-language and omni models
      {id: "qwen3-vl-plus", name: "qwen3-vl-plus"},
      {id: "qwen3-vl-flash", name: "qwen3-vl-flash"},
      {id: "qwen3.5-omni-plus", name: "qwen3.5-omni-plus"},
      {id: "qwen3.5-omni-plus-realtime", name: "qwen3.5-omni-plus-realtime"},
      // Qwen open-source models
      {id: "qwen3.8-2.4t-a95b", name: "qwen3.8-2.4t-a95b"},
      {id: "qwen3.8-27b", name: "qwen3.8-27b"},
      {id: "qwen3.6-27b", name: "qwen3.6-27b"},
      {id: "qwen3.6-35b-a3b", name: "qwen3.6-35b-a3b"},
      {id: "qwen3-235b-a22b", name: "qwen3-235b-a22b"},
      {id: "qwen3-32b", name: "qwen3-32b"},
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
      // Qwen image / Wan image and video generation models
      {id: "qwen-image-3.0-pro", name: "qwen-image-3.0-pro"},
      {id: "wan2.7-image-pro", name: "wan2.7-image-pro"},
      {id: "wan3.0-video", name: "wan3.0-video"},
    ];
  } else if (type === "Baichuan") {
    return [
      {id: "Baichuan-M4", name: "Baichuan-M4"},
      {id: "Baichuan-M3", name: "Baichuan-M3"},
      {id: "Baichuan4-Turbo", name: "Baichuan4-Turbo"},
      {id: "Baichuan4-Air", name: "Baichuan4-Air"},
      {id: "Baichuan4", name: "Baichuan4"},
      {id: "Baichuan3-Turbo-128k", name: "Baichuan3-Turbo-128k"},
      {id: "Baichuan3-Turbo", name: "Baichuan3-Turbo"},
    ];
  } else if (type === "Volcano Engine") {
    return [
      // Seed 2.1 series and the rolling "evolving" model
      {id: "doubao-seed-evolving", name: "doubao-seed-evolving"},
      {id: "doubao-seed-2-1-pro-260915", name: "doubao-seed-2-1-pro-260915"},
      {id: "doubao-seed-2-1-pro-260628", name: "doubao-seed-2-1-pro-260628"},
      {id: "doubao-seed-2-1-turbo-260628", name: "doubao-seed-2-1-turbo-260628"},
      // Seed 2.0 series
      {id: "doubao-seed-2-0-pro-260215", name: "doubao-seed-2-0-pro-260215"},
      {id: "doubao-seed-2-0-lite-260428", name: "doubao-seed-2-0-lite-260428"},
      {id: "doubao-seed-2-0-lite-260215", name: "doubao-seed-2-0-lite-260215"},
      {id: "doubao-seed-2-0-mini-260428", name: "doubao-seed-2-0-mini-260428"},
      {id: "doubao-seed-2-0-mini-260215", name: "doubao-seed-2-0-mini-260215"},
      {id: "doubao-seed-2-0-code-preview-260215", name: "doubao-seed-2-0-code-preview-260215"},
      // Seed 1.8
      {id: "doubao-seed-1-8-251228", name: "doubao-seed-1-8-251228"},
      // Seed character & code
      {id: "doubao-seed-character-260628", name: "doubao-seed-character-260628"},
      {id: "doubao-seed-character-251128", name: "doubao-seed-character-251128"},
      {id: "doubao-seed-code-preview-251028", name: "doubao-seed-code-preview-251028"},
      // Seed 1.6 series
      {id: "doubao-seed-1-6-251015", name: "doubao-seed-1-6-251015"},
      {id: "doubao-seed-1-6-flash-250828", name: "doubao-seed-1-6-flash-250828"},
      {id: "doubao-seed-1-6-vision-250815", name: "doubao-seed-1-6-vision-250815"},
      {id: "doubao-seed-translation-250915", name: "doubao-seed-translation-250915"},
      // Doubao 1.5 series
      {id: "doubao-1-5-pro-32k-250115", name: "doubao-1-5-pro-32k-250115"},
      {id: "doubao-1-5-pro-32k-character-250715", name: "doubao-1-5-pro-32k-character-250715"},
      {id: "doubao-1-5-lite-32k-250115", name: "doubao-1-5-lite-32k-250115"},
      {id: "doubao-1-5-vision-pro-32k-250115", name: "doubao-1-5-vision-pro-32k-250115"},
      // GLM models
      {id: "glm-5-3-flash-260828", name: "glm-5-3-flash-260828"},
      {id: "glm-5-2-260617", name: "glm-5-2-260617"},
      {id: "glm-4-7-251222", name: "glm-4-7-251222"},
      // DeepSeek models
      {id: "deepseek-v4-1-flash-260910", name: "deepseek-v4-1-flash-260910"},
      {id: "deepseek-v4-pro-ga-260813", name: "deepseek-v4-pro-ga-260813"},
      {id: "deepseek-v4-flash-ga-260731", name: "deepseek-v4-flash-ga-260731"},
      {id: "deepseek-v4-pro-260425", name: "deepseek-v4-pro-260425"},
      {id: "deepseek-v4-flash-260425", name: "deepseek-v4-flash-260425"},
      // Embedding models
      {id: "doubao-embedding-vision-251215", name: "doubao-embedding-vision-251215"},
      {id: "doubao-embedding-vision-250615", name: "doubao-embedding-vision-250615"},
      // Video generation models
      {id: "doubao-seedance-2-5-260628", name: "doubao-seedance-2-5-260628"},
      {id: "doubao-seedance-2-0-260128", name: "doubao-seedance-2-0-260128"},
      {id: "doubao-seedance-2-0-fast-260128", name: "doubao-seedance-2-0-fast-260128"},
      {id: "doubao-seedance-2-0-mini-260615", name: "doubao-seedance-2-0-mini-260615"},
      {id: "doubao-seedance-1-5-pro-251215", name: "doubao-seedance-1-5-pro-251215"},
      {id: "doubao-seedance-1-0-pro-250528", name: "doubao-seedance-1-0-pro-250528"},
      {id: "doubao-seedance-1-0-pro-fast-251015", name: "doubao-seedance-1-0-pro-fast-251015"},
      // Image generation models
      {id: "doubao-seedream-5-0-pro-260628", name: "doubao-seedream-5-0-pro-260628"},
      {id: "doubao-seedream-5-0-260128", name: "doubao-seedream-5-0-260128"},
      {id: "doubao-seedream-5-0-lite-260128", name: "doubao-seedream-5-0-lite-260128"},
      {id: "doubao-seedream-4-5-251128", name: "doubao-seedream-4-5-251128"},
      {id: "doubao-seedream-4-0-250828", name: "doubao-seedream-4-0-250828"},
    ];
  } else if (type === "DeepSeek") {
    return [
      {id: "deepseek-v4-pro", name: "deepseek-v4-pro"},
      {id: "deepseek-flash", name: "deepseek-flash"},
    ];
  } else if (type === "StepFun") {
    return [
      {id: "step-3.7-flash", name: "step-3.7-flash"},
      {id: "step-3.5-flash", name: "step-3.5-flash"},
      {id: "step-3.5-flash-2603", name: "step-3.5-flash-2603"},
      {id: "step-1o-turbo-vision", name: "step-1o-turbo-vision"},
    ];
  } else if (type === "Tencent Cloud") {
    return [
      {id: "hunyuan-a13b", name: "hunyuan-a13b"},
      {id: "hunyuan-vision-1.5-instruct", name: "hunyuan-vision-1.5-instruct"},
      {id: "hunyuan-t1-vision-20250916", name: "hunyuan-t1-vision-20250916"},
      {id: "hunyuan-turbos-vision-video", name: "hunyuan-turbos-vision-video"},
      {id: "hunyuan-role-latest", name: "hunyuan-role-latest"},
      {id: "hunyuan-translation", name: "hunyuan-translation"},
      {id: "hunyuan-translation-lite", name: "hunyuan-translation-lite"},
    ];
  } else if (type === "Mistral") {
    return [
      {id: "mistral-medium-2604", name: "mistral-medium-2604 (Medium 3.5)"},
      {id: "mistral-small-2603", name: "mistral-small-2603 (Small 4)"},
      {id: "mistral-large-2512", name: "mistral-large-2512 (Large 3)"},
      {id: "ministral-3-14b-2512", name: "ministral-3-14b-2512"},
      {id: "ministral-3-8b-2512", name: "ministral-3-8b-2512"},
      {id: "ministral-3-3b-2512", name: "ministral-3-3b-2512"},
      {id: "codestral-2508", name: "codestral-2508"},
      {id: "z-ai-glm-5-3", name: "z-ai-glm-5-3"},
      {id: "z-ai-glm-5-2", name: "z-ai-glm-5-2"},
    ];
  } else if (type === "Yi") {
    return [
      {id: "yi-lightning", name: "yi-lightning"},
      {id: "yi-large", name: "yi-large"},
      {id: "yi-large-fc", name: "yi-large-fc"},
      {id: "yi-medium-200k", name: "yi-medium-200k"},
      {id: "yi-vision-v2", name: "yi-vision-v2"},
    ];
  } else if (type === "Silicon Flow") {
    return [
      {id: "deepseek-ai/DeepSeek-V4-Pro", name: "deepseek-ai/DeepSeek-V4-Pro"},
      {id: "deepseek-ai/DeepSeek-V4-Flash", name: "deepseek-ai/DeepSeek-V4-Flash"},
      {id: "deepseek-ai/DeepSeek-V3.2", name: "deepseek-ai/DeepSeek-V3.2"},
      {id: "Pro/deepseek-ai/DeepSeek-V3.2", name: "Pro/deepseek-ai/DeepSeek-V3.2"},
      {id: "deepseek-ai/DeepSeek-V3.1-Terminus", name: "deepseek-ai/DeepSeek-V3.1-Terminus"},
      {id: "Pro/deepseek-ai/DeepSeek-V3.1-Terminus", name: "Pro/deepseek-ai/DeepSeek-V3.1-Terminus"},
      {id: "Qwen/Qwen3.6-35B-A3B", name: "Qwen/Qwen3.6-35B-A3B"},
      {id: "Qwen/Qwen3.6-27B", name: "Qwen/Qwen3.6-27B"},
      {id: "Qwen/Qwen3.5-397B-A17B", name: "Qwen/Qwen3.5-397B-A17B"},
      {id: "zai-org/GLM-5.2", name: "zai-org/GLM-5.2"},
      {id: "Pro/zai-org/GLM-5.1", name: "Pro/zai-org/GLM-5.1"},
      {id: "moonshotai/Kimi-K2.7-Code", name: "moonshotai/Kimi-K2.7-Code"},
      {id: "Pro/moonshotai/Kimi-K2.6", name: "Pro/moonshotai/Kimi-K2.6"},
      {id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMaxAI/MiniMax-M2.5"},
      {id: "Pro/MiniMaxAI/MiniMax-M2.5", name: "Pro/MiniMaxAI/MiniMax-M2.5"},
      {id: "meituan-longcat/LongCat-2.0", name: "meituan-longcat/LongCat-2.0"},
      {id: "nex-agi/Nex-N2-Pro", name: "nex-agi/Nex-N2-Pro"},
    ];
  } else if (type === "Grok") {
    return [
      {id: "grok-4.6", name: "grok-4.6"},
      {id: "grok-4.5", name: "grok-4.5"},
      {id: "grok-4.3", name: "grok-4.3"},
      {id: "grok-4.20-0309-reasoning", name: "grok-4.20-0309-reasoning"},
      {id: "grok-4.20-0309-non-reasoning", name: "grok-4.20-0309-non-reasoning"},
      {id: "grok-4.20-multi-agent-0309", name: "grok-4.20-multi-agent-0309"},
      {id: "grok-build-0.1", name: "grok-build-0.1"},
      // Image generation models
      {id: "grok-imagine-image-2.0", name: "grok-imagine-image-2.0"},
      {id: "grok-imagine-image-quality", name: "grok-imagine-image-quality"},
      {id: "grok-imagine-image", name: "grok-imagine-image"},
    ];
  } else if (type === "Writer") {
    return [
      {id: "palmyra-x6", name: "Palmyra X6"},
      {id: "palmyra-x5", name: "Palmyra X5"},
      {id: "palmyra-x4", name: "Palmyra X4"},
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
        {id: "Keenable", name: "Keenable"},
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
        {id: "cosyvoice-v2", name: "cosyvoice-v2"},
      ];
    } else {
      return [];
    }
  } else if (category === "Speech-to-Text") {
    if (type === "Alibaba Cloud") {
      return [
        {id: "fun-asr-realtime", name: "fun-asr-realtime"},
        {id: "fun-asr-flash-8k-realtime", name: "fun-asr-flash-8k-realtime"},
        {id: "paraformer-realtime-v2", name: "paraformer-realtime-v2"},
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
  return ["OpenAI", "Claude", "Gemini", "DeepSeek", "Grok", "Ollama", "OpenRouter", "Mistral", "MiniMax", "Azure", "OpenAI Compatible", "Alibaba Cloud", "Moonshot", "Silicon Flow", "Volcano Engine", "Baidu Cloud", "Amazon Bedrock", "Hugging Face", "iFlytek", "ChatGLM", "Cohere", "Baichuan", "StepFun", "Tencent Cloud", "Yi", "Writer", "Local", "OpenCode"];
}

export function getModelProviderMetadata(type) {
  const metadata = {
    "OpenAI": {desc: "GPT-6 Astra, GPT-5.6...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "gpt-6-astra"},
    "Claude": {desc: "Claude Fable, Opus, Sonnet...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "claude-opus-5"},
    "Gemini": {desc: "Gemini 3.8 Flash, 3.1 Pro...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "gemini-3.8-flash"},
    "DeepSeek": {desc: "DeepSeek V4 Pro, Flash...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "deepseek-v4-pro"},
    "Grok": {desc: "Grok 4.6, Grok 4.5...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "grok-4.6"},
    "Ollama": {desc: "Run models locally", needsApiKey: false, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "deepseek-r1:671b", urlPlaceholder: "http://localhost:11434", defaultUrl: "http://localhost:11434"},
    "OpenRouter": {desc: "100+ models unified", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "anthropic/claude-opus-5"},
    "Mistral": {desc: "Mistral Medium 3.5, Large 3...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "mistral-medium-2604"},
    "MiniMax": {desc: "MiniMax-M3, M2...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "MiniMax-M3"},
    "Azure": {desc: "Azure-hosted GPT models", needsApiKey: true, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "gpt-6-astra", urlPlaceholder: "https://your-resource.openai.azure.com"},
    "OpenAI Compatible": {desc: "Any compatible API", needsApiKey: true, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "", urlPlaceholder: "https://api.example.com/v1"},
    "Alibaba Cloud": {desc: "Qwen3.8 Max, Qwen3.7 Plus...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "qwen3.8-max"},
    "Moonshot": {desc: "Kimi K3, Kimi K2.7 Code...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "kimi-k3"},
    "Silicon Flow": {desc: "DeepSeek, Qwen, and more", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "deepseek-ai/DeepSeek-V3.2"},
    "Volcano Engine": {desc: "ByteDance AI platform", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "doubao-seed-2-1-pro-260915"},
    "Baidu Cloud": {desc: "ERNIE Bot models", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "ernie-5.0"},
    "Amazon Bedrock": {desc: "Claude, GPT, Nova on AWS", needsApiKey: true, needsUrl: false, needsClientId: true, needsRegion: true, defaultSubType: "global.anthropic.claude-opus-5"},
    "Hugging Face": {desc: "Llama, Qwen, open models", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "meta-llama/Llama-3.3-70B-Instruct"},
    "iFlytek": {desc: "Spark X2, Spark X1.5...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "spark-x2"},
    "ChatGLM": {desc: "GLM-5.3, GLM-4.7...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "glm-5.3"},
    "Cohere": {desc: "Command A, Command R...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "command-a-plus-05-2026"},
    "Baichuan": {desc: "Baichuan-M4, Baichuan4...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "Baichuan4-Turbo"},
    "StepFun": {desc: "Step 3.7 Flash, Step 3.5...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "step-3.7-flash"},
    "Tencent Cloud": {desc: "Hunyuan models", needsApiKey: true, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "hunyuan-a13b", urlPlaceholder: "https://hunyuan.tencentcloudapi.com"},
    "Yi": {desc: "Yi Lightning, Yi Large...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "yi-lightning"},
    "Writer": {desc: "Palmyra X6, X5...", needsApiKey: true, needsUrl: false, needsClientId: false, needsRegion: false, defaultSubType: "palmyra-x6"},
    "Local": {desc: "Self-hosted model endpoint", needsApiKey: true, needsUrl: true, needsClientId: false, needsRegion: false, defaultSubType: "custom-model", urlPlaceholder: "http://localhost:8000/v1"},
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
    {id: "Weixin Claw", name: "Weixin Claw"},
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
    "Weixin Claw": {desc: "Connect via personal Weixin QR login", tokenLabel: "", tokenPlaceholder: "", helpUrl: "https://github.com/the-open-agent/openagent"},
    "Snapchat": {desc: "Connect via Snapchat Kit Bot", tokenLabel: "Access Token", tokenPlaceholder: "your-oauth-access-token", helpUrl: "https://kit.snapchat.com/"},
    "X Direct Messages": {desc: "Connect via X Direct Messages", tokenLabel: "OAuth Token", tokenPlaceholder: "your-oauth-token", helpUrl: "https://developer.x.com"},
  };
  return metadata[type] || {desc: "", tokenLabel: "Token", tokenPlaceholder: "", helpUrl: ""};
}

function isAlibabaImageGenerationModel(lower) {
  // Wan (formerly Wanxiang) image models and the Qwen-Image generation models
  return lower.startsWith("wan2.") || lower.startsWith("wan3.") || lower.startsWith("qwen-image");
}

export function isImageGenerationModelProvider(provider) {
  if (!provider || provider.category !== "Model") {
    return false;
  }
  const subType = (provider.subType || "").trim();
  const type = provider.type || "";
  const lower = subType.toLowerCase();

  if (type === "OpenAI" || type === "Azure") {
    if (lower.startsWith("gpt-image") || lower === "chatgpt-image-latest") {
      return true;
    }
  }
  if (type === "Gemini") {
    if (lower === "gemini-2.5-flash-image" || lower.includes("gemini-3.1-flash-image") ||
        lower.includes("gemini-3.1-flash-lite-image") || lower.includes("gemini-3-pro-image")) {
      return true;
    }
  }
  if (type === "Alibaba Cloud") {
    if (isAlibabaImageGenerationModel(lower)) {
      return true;
    }
  }
  if (type === "Volcano Engine") {
    if (lower.includes("seedream")) {
      return true;
    }
  }
  if (type === "Grok") {
    if (lower.startsWith("grok-imagine-image")) {
      return true;
    }
  }
  if (lower.startsWith("gpt-image") || lower === "chatgpt-image-latest") {
    return true;
  }
  if (lower.includes("seedream")) {
    return true;
  }
  if (isAlibabaImageGenerationModel(lower)) {
    return true;
  }
  if (/(^|-)image(-|preview)/i.test(subType) && !lower.includes("embedding") && type === "Gemini") {
    return true;
  }
  return false;
}

export function getThinkingModelMaxTokens(subType) {
  // Only models that still accept a fixed thinking budget expose the budget input.
  // Claude Fable 5/5.1, Opus 5/4.8/4.7/4.6 and Sonnet 5/4.6 use adaptive thinking and
  // reject "thinking.budget_tokens" with a 400, so no budget is configurable for them.
  if (subType.includes("claude-haiku-4-5")) {
    return 64000;
  }
  return 0;
}
