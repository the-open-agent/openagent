<div align="center">

<img src="https://raw.githubusercontent.com/the-open-agent/static/master/img/openagent-logo_1600x276.png" alt="OpenAgent Logo" width="400">

<h1>OpenAgent</h1>

<p><strong>Next-generation personal AI assistant powered by LLM, RAG and agent loops</strong><br>
<em>Supporting computer-use, browser-use and coding agent</em></p>

<p>
  <a href="https://github.com/the-open-agent/openagent/actions/workflows/build.yml">
    <img alt="Build" src="https://github.com/the-open-agent/openagent/workflows/Build/badge.svg?style=flat-square">
  </a>
  <a href="https://github.com/the-open-agent/openagent/releases/latest">
    <img alt="Release" src="https://img.shields.io/github/v/release/the-open-agent/openagent.svg">
  </a>
  <a href="https://hub.docker.com/r/casbin/openagent">
    <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/casbin/openagent.svg">
  </a>
  <a href="https://goreportcard.com/report/github.com/the-open-agent/openagent">
    <img alt="Go Report Card" src="https://goreportcard.com/badge/github.com/the-open-agent/openagent?style=flat-square">
  </a>
  <a href="https://github.com/the-open-agent/openagent/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/the-open-agent/openagent?style=flat-square">
  </a>
  <a href="https://discord.gg/5rPsrAzK7S">
    <img alt="Discord" src="https://img.shields.io/discord/1022748306096537660?logo=discord&label=discord&color=5865F2">
  </a>
</p>

</div>

---

## ✨ Overview

OpenAgent is an open-source personal AI assistant that brings together powerful LLMs, your own knowledge base, and autonomous agent loops — all in one self-hostable platform. Connect any model provider, build a RAG knowledge base from your documents, and let agents browse the web, run code, and call any MCP-compatible tool on your behalf.

<div align="center">

| 📊 Usage Analytics | 📋 Activity Monitoring |
|:---:|:---:|
| ![Usage Analytics](https://raw.githubusercontent.com/the-open-agent/static/master/img/screenshot-usages.png) | ![Activity Monitoring](https://raw.githubusercontent.com/the-open-agent/static/master/img/screenshot-activities.png) |
| 🛠️ Tool Management | 🔍 Detailed Logs |
| ![Tool Management](https://raw.githubusercontent.com/the-open-agent/static/master/img/screenshot-tools.png) | ![Detailed Logs](https://raw.githubusercontent.com/the-open-agent/static/master/img/screenshot-logs.png) |

</div>

> 📝 **Note:** Screenshots above showcase the built-in admin dashboard.

---

## 🚀 Online Demo

| 🌐 Environment | URL | 💡 Notes |
|:---|:---|:---|
| **Live Preview** | https://demo.openagentai.org | Read-only tour — no account needed |
| **Playground** | https://try.openagentai.org | Make changes freely — data resets every 5 minutes |

---

## 📦 Quick Start

Pre-built binaries are available for **Linux**, **macOS**, and **Windows** (`amd64` / `arm64`). The install script downloads the latest release, installs it, and starts the server on **port 14000**.

### 🔧 Install Binary (Recommended)

**macOS / Linux / WSL**

```bash
curl -fsSL --proto '=https' --tlsv1.2 \
  https://raw.githubusercontent.com/the-open-agent/openagent/master/scripts/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/the-open-agent/openagent/master/scripts/install.ps1 | iex
```

Then open [http://localhost:14000](http://localhost:14000).

> 💡 Optional environment variables: `OPENAGENT_VERSION`, `INSTALL_DIR`, `BIN_DIR`.

### 🛠️ Build from Source

```bash
# Backend
go build

# Frontend
cd web && yarn install && yarn start
```

---

## 🌟 Highlights

### 🔄 Agent Loops

| Feature | Description |
|:---|:---|
| 🌐 **Browser-Use** | Drive a real browser: navigate, click, fill forms, scrape, and screenshot pages |
| 🔎 **Web Search & Fetch** | Search the web and pull page content directly into the agent's context |
| 💻 **Shell Execution** | Run shell commands and scripts from within the agent loop |
| 📄 **Office Automation** | Read and write Word, Excel, and PowerPoint files |
| 🔌 **MCP (Model Context Protocol)** | Connect any MCP-compatible server over SSE, Stdio, or StreamableHTTP and expose its tools to the agent |
| 👁️ **Transparent Tool Calls** | See exactly which tool was invoked, with what arguments, and what it returned, step by step |

### 📚 RAG & Knowledge Base

| Feature | Description |
|:---|:---|
| 📤 **Document Ingestion** | Upload PDFs, Word docs, Excel sheets, and more; they are chunked, embedded, and indexed automatically |
| 🔍 **Semantic Search** | Every chat retrieves the most relevant passages from your knowledge base before the LLM responds |
| 🔗 **Pluggable Embedding Providers** | OpenAI, Azure, Gemini, Qwen, Cohere, Jina, HuggingFace, local models, and more |
| 🗂️ **Per-Store Isolation** | Organise knowledge into separate stores and assign them to individual chats or applications |

### 🤖 30+ Model Providers

Works out of the box with all major LLM providers — configure as many as you like and switch between them per chat:

<p align="center">
  <code>OpenAI</code> · <code>Azure OpenAI</code> · <code>Claude (Anthropic)</code> · <code>Gemini (Google)</code> · <code>DeepSeek</code> · <code>Mistral</code> · <code>Grok</code> · <code>Qwen</code> · <code>Doubao</code> · <code>Moonshot</code> · <code>ChatGLM</code> · <code>Baichuan</code> · <code>Ernie</code> · <code>iFlytek</code> · <code>HuggingFace</code> · <code>Cohere</code> · <code>Amazon Bedrock</code> · <code>OpenRouter</code> · <code>local models</code> · <code>and more</code>
</p>

### ⚡ Workflow Automation

| Feature | Description |
|:---|:---|
| 🎨 **Visual Workflow Builder** | Compose multi-step pipelines with a BPMN-style editor |
| 🔀 **Conditional & Parallel Execution** | Branch on gateway conditions and run tasks concurrently |
| ⏰ **Task Scheduling** | Run workflows or agent jobs on a recurring schedule |
| 📊 **Usage Analytics** | Track token consumption and cost per provider, model, and user |

### 🏗️ Platform Features

| Feature | Description |
|:---|:---|
| 🔐 **Single Sign-On** | OIDC / OAuth2 / LDAP / SAML via the integrated auth layer |
| 🏢 **Multi-tenant** | Separate workspaces per user or organisation |
| 🌐 **REST API + Swagger UI** | Every feature is accessible programmatically |
| 📋 **Audit Logs** | Full activity history for every action |
| 🗄️ **File & Video Management** | Built-in storage for files, images, and video content |

### 📈 Admin Dashboard

| Feature | Description |
|:---|:---|
| 📊 **Usage Statistics** | Comprehensive metrics covering applications, users, chats, messages, tokens, and estimated cost with interactive charts and heatmaps |
| 📋 **Activity Monitoring** | Real-time visualization of system operations with success/error tracking, operation-type pie charts, and trend analysis |
| 🛠️ **Tool Management** | Centralised management of all agent tools — browser-use, GUI automation, office, shell, web search, and more — with full CRUD control |
| 🔍 **Detailed Request Logs** | Inspect complete request/response payloads with JSON formatting, filtering, and debugging capabilities for every API call |

---

## 📖 Documentation

👉 [https://www.openagentai.org/](https://www.openagentai.org/)

---

## 🤝 Community

| Platform | Link |
|:---|:---|
| 💬 Discord | [https://discord.gg/5rPsrAzK7S](https://discord.gg/5rPsrAzK7S) |
| 🐛 Issues & PRs | Welcome — please open an issue first to discuss larger changes |

---

## 📄 License

[Apache-2.0](https://github.com/the-open-agent/openagent/blob/master/LICENSE)
