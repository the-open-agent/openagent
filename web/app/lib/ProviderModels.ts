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

// @ts-nocheck

export const openaiModels = [
  // GPT-5.5 series (latest)
  {id: "gpt-5.5", name: "gpt-5.5"},
  {id: "gpt-5.5-mini", name: "gpt-5.5-mini"},
  {id: "gpt-5.5-nano", name: "gpt-5.5-nano"},
  // GPT-5.4 series (latest)
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

export const openaiEmbeddings = [
  {id: "text-embedding-ada-002", name: "text-embedding-ada-002"},
  {id: "text-embedding-3-small", name: "text-embedding-3-small"},
  {id: "text-embedding-3-large", name: "text-embedding-3-large"},
];

export function getCompatibleProviderOptions(category) {
  if (category === "Model") {
    return (
      [
        // GPT-5.4 series (latest)
        {"id": "gpt-5.5", "name": "gpt-5.5"},
        {"id": "gpt-5.5-mini", "name": "gpt-5.5-mini"},
        {"id": "gpt-5.5-nano", "name": "gpt-5.5-nano"},
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
      {id: "claude-opus-4-6", name: "claude-opus-4-6"},
      {id: "claude-sonnet-4-6", name: "claude-sonnet-4-6"},
      {id: "claude-haiku-4-5", name: "claude-haiku-4-5"},
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
      {id: "anthropic/claude-opus-4-6", name: "anthropic/claude-opus-4-6"},
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
      {id: "kimi-k2.6", name: "kimi-k2.6"},
      {id: "kimi-k2.5", name: "kimi-k2.5"},
      {id: "kimi-k2-0905-preview", name: "kimi-k2-0905-preview"},
      {id: "kimi-k2-0711-preview", name: "kimi-k2-0711-preview"},
      {id: "kimi-k2-turbo-preview", name: "kimi-k2-turbo-preview"},
      {id: "kimi-k2-thinking", name: "kimi-k2-thinking"},
      {id: "kimi-k2-thinking-turbo", name: "kimi-k2-thinking-turbo"},
      {id: "kimi-latest", name: "kimi-latest (Auto Tier)"},
      {id: "moonshot-v1-128k", name: "moonshot-v1-128k"},
      {id: "moonshot-v1-32k", name: "moonshot-v1-32k"},
      {id: "moonshot-v1-8k", name: "moonshot-v1-8k"},
    ];
  } else if (type === "Amazon Bedrock") {
    return [
      {id: "anthropic.claude-opus-4-7", name: "anthropic.claude-opus-4-7"},
      {id: "anthropic.claude-opus-4-6", name: "anthropic.claude-opus-4-6"},
      {id: "anthropic.claude-sonnet-4-6", name: "anthropic.claude-sonnet-4-6"},
      {id: "anthropic.claude-haiku-4-5", name: "anthropic.claude-haiku-4-5"},
      {id: "amazon.nova-pro-v1:0", name: "amazon.nova-pro-v1:0"},
      {id: "amazon.nova-lite-v1:0", name: "amazon.nova-lite-v1:0"},
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
      {id: "qwen3-max", name: "qwen3-max"},
      {id: "qwen3.5-plus", name: "qwen3.5-plus"},
      {id: "qwen3.5-flash", name: "qwen3.5-flash"},
      {id: "qwen-plus", name: "qwen-plus"},
      {id: "qwen-flash", name: "qwen-flash"},
      {id: "qwen3-235b-a22b", name: "qwen3-235b-a22b"},
      {id: "qwen3-32b", name: "qwen3-32b"},
      {id: "qwen-max", name: "qwen-max"},
      {id: "qwen-max-longcontext", name: "qwen-max-longcontext"},
      {id: "qwen-turbo", name: "qwen-turbo"},
      {id: "qwen-long", name: "qwen-long"},
      {id: "deepseek-r1", name: "deepseek-r1"},
      {id: "deepseek-v3", name: "deepseek-v3"},
      {id: "deepseek-v3.1", name: "deepseek-v3.1"},
      {id: "deepseek-v3.2", name: "deepseek-v3.2"},
      {id: "deepseek-r1-distill-qwen-1.5b", name: "deepseek-r1-distill-qwen-1.5b"},
      {id: "deepseek-r1-distill-qwen-7b", name: "deepseek-r1-distill-qwen-7b"},
      {id: "deepseek-r1-distill-qwen-14b", name: "deepseek-r1-distill-qwen-14b"},
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
      {id: "mistral-large-3", name: "mistral-large-3"},
      {id: "mistral-medium-3.5", name: "mistral-medium-3.5"},
      {id: "devstral-2", name: "devstral-2"},
      {id: "codestral-2508", name: "codestral-2508"},
      {id: "pixtral-large", name: "pixtral-large"},
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
      {id: "grok-4.3", name: "grok-4.3"},
      {id: "grok-4.20-reasoning", name: "grok-4.20-reasoning"},
      {id: "grok-4.20-non-reasoning", name: "grok-4.20-non-reasoning"},
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
