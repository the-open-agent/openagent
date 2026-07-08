---
name: ollama-models
description: Manage local Ollama models (pull, list, run) and wire them into OpenAgent.
homepage: https://ollama.com/
metadata:
  { "openclaw": { "emoji": "🦙" } }
---

## Goal

Help the user work with **local Ollama models** and configure them in OpenAgent.

## What you can do

- List installed models
- Pull any model by name
- Run a quick smoke test prompt
- Tell the user what model name to put in the OpenAgent **Ollama provider Sub type**

## Commands

1) List models:

```bash
ollama list
```

2) Pull a model (examples):

```bash
ollama pull qwen2.5:7b
ollama pull llama3.2:3b
ollama pull deepseek-r1:7b
```

3) Run a model:

```bash
ollama run qwen2.5:7b
```

## OpenAgent wiring checklist

- Ollama server URL: `http://localhost:11434`
- Sub type: the exact name from `ollama list` (e.g. `qwen2.5:7b`)
- If you see `404 model not found`, pull the model first (`ollama pull <name>`)

