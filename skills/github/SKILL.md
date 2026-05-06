---
name: github
description: Use when interacting with GitHub repositories, authentication, remotes, pushes, or repository creation through the GitHub CLI and related git workflows.
homepage: https://cli.github.com/
metadata:
  {
    "emoji": "🐙"
  }
---

# GitHub

## Overview

Prefer `gh` for all GitHub operations. The default goal is to complete the full GitHub flow with the least possible user effort: detect existing authentication first, reuse it if available, and only ask the user for the smallest missing step.

Never ask the user to manually perform a long GitHub setup if the agent can check, reuse, or finish it directly.

## Core Rules

- Prefer `gh` over raw GitHub API calls.
- Prefer existing authenticated state over asking for new credentials.
- Prefer non-interactive checks before prompting the user.
- Prefer the smallest unblock request:
  - paste a one-time code
  - confirm browser login
  - provide a PAT
  - confirm repository visibility
- Do not ask the user to manually create the repository if `gh` can do it.
- Do not ask the user to manually add remotes, initialize Git, or push if the agent can do it.
- Never print, echo, log, summarize, or restate secrets.
- Never store secrets in files, commits, repo config, docs, examples, or chat summaries.
- Never switch credential strategy unless the current one actually fails.

### Interactive login driving rules

When using `gh auth login` through a shell session, do not assume the browser login step has started after the first prompt or after sending one key.

You must continue driving the interactive flow until there is explicit evidence of one of these states:

1. GitHub CLI has clearly started browser/device authentication
2. GitHub CLI is explicitly waiting for the user to complete external authentication
3. GitHub CLI reports that authentication succeeded
4. GitHub CLI reports a real error and cannot continue

While driving the login flow:

- keep polling the session after each input
- handle intermediate prompts such as protocol selection, SSH/HTTPS choice, credential helper confirmation, browser/device flow confirmation, or similar setup questions
- use minimal inputs such as `enter`, arrow keys, `y`, `n`, or short submitted text as needed
- do not stop after only one successful prompt response
- do not tell the user that the browser has opened unless the command output explicitly indicates that a browser login or web flow has started
- do not tell the user that login is complete unless the command output explicitly indicates success

Acceptable evidence that browser or external auth has actually started includes output such as:

- a message that a browser is being opened
- a URL to visit
- a device code to enter
- explicit wording that GitHub authentication is waiting for completion

If the shell session remains running but only shows that an earlier prompt was answered, continue polling instead of summarizing the state prematurely.

Only ask the user to act when the output clearly shows an external action is now required.

When the user says they completed browser or device authorization, do not start a new `gh auth login` flow immediately.

Instead:

1. continue polling the existing shell session if it is still running
2. wait for explicit success or failure from that same session
3. only if that session has exited or is unrecoverable, then check `gh auth status`
4. only start a brand-new login flow if the previous login session has clearly failed or been closed

If the shell output contains prompts like:

- "Press Enter to open ..."
- "Press Enter to continue"
- similar one-step local confirmation prompts

then send `enter` automatically and continue polling the same session.

Do not stop at that prompt.
Do not ask the user to confirm completion yet.
Do not start a new login flow while this session is still running.

## Credential Handling Priority

### 1. Reuse `gh` authentication first

Check whether `gh` exists and is already authenticated.

Use this path when possible:

- `gh auth status`
- if authenticated, continue directly with:
  - repo detection
  - `gh repo create`
  - remote setup
  - push

If `gh` is authenticated, do not ask the user for tokens, passwords, SSH keys, or browser login.

### 2. If `gh` exists but is not authenticated, log in with `gh` directly

If `gh` is installed but not authenticated, use `gh auth login` directly and continue the GitHub flow after login succeeds.

Preferred order:

1. browser/web login via `gh auth login -h github.com -w`
2. standard interactive `gh auth login -h github.com`
3. PAT-based login only if the normal `gh` login path is unavailable or fails

Rules:

- do not switch away from `gh` login unless it actually fails
- do not ask the user to manually create repositories or configure git
- do not ask the user to perform a long GitHub setup outside the login itself
- continue automatically as soon as login succeeds

When login requires user interaction:

- ask for only the smallest possible action
- examples:
  - “Please complete the GitHub browser login that just opened.”
  - “Please finish the GitHub CLI login prompts.”
  - “Please paste a GitHub PAT with repo access.”

After login succeeds, continue directly with:

- repo detection
- `gh repo create`
- remote setup
- push

### 3. If `gh` is unavailable, try to install it first

If `gh` is missing:

- first try to install `gh` automatically using the platform's normal package manager or a reasonable official installation path
- prefer non-interactive installation methods when available
- after installation, re-check whether `gh` exists and continue with the normal `gh`-first flow
- only fall back away from `gh` if installation actually fails, is blocked by the environment, or would require disproportionate user effort

Acceptable install attempts include examples like:

- Homebrew on macOS
- `apt`, `dnf`, or similar package managers on Linux
- `winget` or other normal package-manager paths on Windows

Rules:

- do not ask the user to install `gh` manually before you have tried a reasonable automatic install path
- do not switch to a different credential strategy just because `gh` is missing initially
- if installation fails, summarize the blocker briefly and then continue to the fallback path below

### 4. If `gh` is still unavailable, fall back to Git

If `gh` is missing:

- continue with plain `git`
- prefer existing Git credential helpers or existing SSH authentication
- inspect the environment before asking for credentials

Check for likely reusable auth:

- existing `origin` remote
- existing Git credential helper
- working SSH auth to GitHub
- existing authenticated HTTPS remote behavior

Only if those paths fail should the user be asked for one minimal credential input.

## Minimal-Interruption Prompting

When user input is required, ask for only one concrete item at a time.

Good prompts:

- “Please confirm whether the repo should be public or private.”
- “Please complete the GitHub login in your browser.”
- “Please paste a GitHub PAT with repo access.”
- “Please confirm the GitHub owner/org name.”

Bad prompts:

- asking the user to manually create a repo
- asking the user to configure Git from scratch without first checking
- asking for multiple credentials at once
- asking the user to inspect local config manually if the agent can inspect it

## Safe Credential Rules

- Treat PATs, device codes, auth tokens, cookies, and SSH private keys as secrets.
- Never echo secrets back to the user.
- Never include secrets in command output summaries.
- Never write secrets into repo files or examples.
- Never commit `.env`, token files, or copied credentials.
- If a command might expose a secret in stdout/stderr, avoid reproducing that output verbatim.
- If the user gives a token, use it only for the current task unless explicitly told otherwise.

## Standard Execution Flow

### A. Detect environment

Check in this order:

1. Is this already a Git repo?
2. Is there already a remote?
3. Is `gh` installed?
4. Is `gh` authenticated?
5. If not using `gh`, does Git already have usable auth?

### B. If already connected to GitHub

If the repo already has a valid GitHub remote and push access works:

- do not recreate the repo
- do not replace auth
- just push

### C. If Git repo exists but no GitHub repo exists yet

Preferred:

- create the GitHub repo with `gh repo create`
- set or update `origin`
- push the current branch

Only ask the user for:

- owner/org if ambiguous
- public vs private if not specified
- authentication only if required

### D. If not a Git repo yet

Do the setup directly:

- initialize Git
- add files
- create initial commit if needed
- create GitHub repo
- add remote
- push

Do not ask the user to perform these steps manually.

## `gh`-First Behavior

When `gh` is available and authenticated, prefer commands in this shape:

- inspect auth
- create repo
- set remote if needed
- push branch
- optionally enable features like description/homepage/topics later

Use plain Git only for local repository operations or when `gh` cannot complete the GitHub-side action.

## Git / API Fallback Behavior

Only use this fallback when:

- `gh` is not installed and cannot be installed reasonably
- or `gh` is installed but unusable for the required operation
- or the environment blocks the normal `gh` flow in a way that cannot be resolved with minimal user input

Fallback order:

1. direct GitHub API + local `git`
2. plain `git` with existing SSH or credential-helper auth
3. HTTPS + PAT only if no better reusable auth exists

Fallback rules:

- still minimize user effort
- still prefer reusing existing credentials
- still never ask the user to create the repository manually if the agent can do it through the API
- still avoid exposing or persisting secrets
- still continue automatically once the minimal missing credential or confirmation is provided

If PAT is required:

- ask only for a token with the minimum needed scope, usually repo write access
- use it only to complete the push flow
- avoid leaving it in shell history, files, process args, or remote URLs when possible

## Success Criteria

A successful run means:

- the local project is a valid Git repo if needed
- the GitHub repo exists
- the correct remote is configured
- the current branch is pushed
- credentials were reused when possible
- user involvement was limited to the smallest truly necessary action
- no secret was exposed or persisted unsafely
