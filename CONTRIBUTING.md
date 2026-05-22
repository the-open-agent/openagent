# Contributing to OpenAgent

Thank you for your interest in contributing to OpenAgent! This document explains how to get involved.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Ways to Contribute

- **Bug reports** — open an issue with steps to reproduce, expected vs. actual behavior, and environment details
- **Feature requests** — open an issue describing the use case and proposed solution
- **Code contributions** — bug fixes, new features, documentation improvements
- **New AI providers** — integrate a new model provider in `model/`
- **Translations** — improve or add locales under `web/src/locales/`

## Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Go | 1.23.6+ |
| Node.js | 20+ |
| Yarn | 1.x |
| MySQL | 8.0+ (or MariaDB) |
| Auth service | latest |

### 1. Clone and configure

```bash
git clone https://github.com/the-open-agent/openagent.git
cd openagent
cp conf/app.conf.example conf/app.conf   # edit DB and auth settings
```

Key fields in `conf/app.conf`:

```ini
dataSourceName = root:password@tcp(localhost:3306)/openagent
casdoorEndpoint = http://localhost:8000
casdoorClientId = <your-client-id>
casdoorClientSecret = <your-client-secret>
casdoorOrganization = built-in
casdoorApplication = app-openagent
```

### 2. Start the auth service

```bash
# Using Docker
docker run -d -p 8000:8000 casbin/casdoor-all-in-one
```

Create an application in the auth service and copy the client ID/secret into `app.conf`.

### 3. Backend

```bash
# Install dependencies and run
go mod download
go run main.go
# Runs on http://localhost:14444 by default
```

### 4. Frontend

```bash
cd web
yarn install
yarn start   # Dev server on http://localhost:3000 (proxies API to :14444)
```

### 5. Docker (all-in-one, quickest start)

```bash
docker-compose up
# Opens on http://localhost:14000
```

## Making Changes

1. **Fork** the repository and create a branch from `master`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

   Use a semantic prefix — `feat/`, `fix/`, `docs/`, `chore/`, or `refactor/`.

2. Make your changes following the conventions below.

3. **Run tests and lint** before pushing:

   ```bash
   # Backend
   go test -v $(go list ./...) -tags skipCi
   golangci-lint run

   # Frontend
   cd web && yarn lint && yarn test
   ```

4. **Commit** with a semantic message:

   ```
   feat: add support for XYZ provider
   fix: resolve crash when uploading PDF
   docs: update deployment instructions
   ```

5. **Open a pull request** against `master` with a clear description of what changed and why.

## Code Conventions

### Backend (Go)

- Beego MVC pattern: controllers handle HTTP, `object/` contains business logic
- New AI model providers go in `model/` and must implement the provider interface
- Routes are registered in `routers/router.go`
- Formatting: `gofumpt` (enforced by golangci-lint)
- Avoid duplicate i18n keys between frontend and backend

### Frontend (React)

- UI components use Ant Design v5
- i18n strings must be added to **both** `web/src/locales/en/data.json` and `web/src/locales/zh/data.json`
- API calls go through helper modules in `web/src/backend/`
- State via React Context/Hooks — no Redux

## Adding a New AI Provider

1. Create `model/<provider>.go` implementing the provider interface (see `model/openai.go` for reference).
2. Register the provider in `model/provider.go`.
3. Add the provider name to the frontend select options and i18n strings.
4. Add a test in `model/<provider>_test.go` if an API key can be mocked or injected via env.

## Adding Translations

1. Add new keys to `web/src/locales/en/data.json` (English, required).
2. Add the same keys to `web/src/locales/zh/data.json` (Chinese).
3. Additional locales in `web/src/locales/` are welcome — copy the `en/` folder structure.
4. Run `cd web && yarn lint` to catch missing keys.

## CI/CD Expectations

Every pull request runs the following checks automatically:

| Check | Command |
|-------|---------|
| Go unit tests | `go test -v ./... -tags skipCi` |
| Go build | `go build ./...` |
| golangci-lint | `golangci-lint run` |
| Frontend build | `yarn run build` |
| Frontend lint | `yarn lint` |

All checks must pass before a PR can be merged.

## Reporting Security Vulnerabilities

Please **do not** open a public issue for security vulnerabilities. Report them privately via [GitHub Security Advisories](https://github.com/the-open-agent/openagent/security/advisories/new).

## Getting Help

- [GitHub Discussions](https://github.com/the-open-agent/openagent/discussions)
- [Discord](https://discord.gg/5rPsrAzK7S)
- [GitHub Issues](https://github.com/the-open-agent/openagent/issues)
