
[中文版](./README.zh.md) | [English](./README.md)

# ae-cli

CLI tool for ThinkingAI AgenticEngine (AE) platform. Designed for both AI Agent and human use.

## Installation

**Step 1: Install ae-cli**

```bash
npm install -g @thinkingai/ae-cli
```

**Step 2: Install AI Agent Skills**

```bash
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

This installs 4 skill packages into your AI coding agent (Claude Code, Trae, Cursor, etc.), enabling the agent to understand and call ae-cli commands.

To update:

```bash
npm cache clean --force && npm install -g @thinkingai/ae-cli
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## Quick Start

```bash
# First run — interactive host setup + auto-login
ae-cli config
```

The `config` command opens an interactive terminal UI:
- First run: prompts you to add a AE host URL and label, then auto-authenticates
- Subsequent runs: shows all configured hosts, lets you switch, edit, delete, or add new ones

```
AE Host Manager  (↑↓ select · Enter switch · e edit label · d delete · a add · q quit)

❯ ● Production  https://ta.thinkingdata.cn  ✓
  ○ Staging     https://ta-staging.example.com:8080  ✗
  + Add new host...
```

After selecting a host, ae-cli automatically checks if the token is valid. If not, it triggers `auth login` for you.

## Usage

```bash
# AE meta domain (metadata and governance)
ae-cli analysis_meta +list_events --project_id 1

# Table output
ae-cli analysis_meta +list_events --project_id 1 --format table

# Raw API call
ae-cli api GET /v1/ta/event/catalog/listEvent --params '{"projectId": 1}'
```

## Authentication

Authentication is handled per-host. Each AE host URL maintains its own token.

```bash
# Auto-login for active host (macOS, extracts token from Chrome)
ae-cli auth login

# Manually set token
ae-cli auth set-token <your-token>

# Check status
ae-cli auth status

# Logout
ae-cli auth logout
```

## Commands

### Domains

| Domain | Commands | Description |
|--------|----------|-------------|
| `analysis` | 30+ | Analysis workflows: alerts, reports, dashboards, ad-hoc/drilldown, entity/event details, analysis schema |
| `analysis_audience` | 10+ | Audience operations: clusters, tags, and cluster/tag definition schema |
| `analysis_meta` | 20+ | Metadata governance: events/properties, metrics, virtual metadata, project config, tracking plan, mark times, entity catalog |
| `engage` | 40+ | Hermes Engage MCP: channels, tasks, configs, flows, strategies |
| `dataops_repo` | 8 | Data warehouse repos: spaces, catalogs, schemas, members |
| `dataops_datatable` | 10+ | Data tables: table creation, views, batch operations, data dictionary |
| `dataops_flow` | 20+ | Task flows: flow creation, task nodes, scheduling, execution, monitoring |
| `dataops_ide` | 10+ | IDE queries: metadata browsing, SQL execution, query management |
| `dataops_integration` | 20+ | Data integration: datasource management, sync solutions, data synchronization |
| `community` | 10+ | Community analysis: posts search, sentiment analysis, topic trends, livestream data |
| `analysis_common` | 2 | Cross-module common constraints: resource link completion, project ID gate |
| `auth` / `config` | 2 | Authentication and host configuration |

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--host <url>` | Override active AE host URL | from config |
| `--format <json\|table>` | Output format | json |
| `--jq <expr>` | Filter expression | - |
| `--dry-run` | Preview request | false |
| `--yes` | Skip confirmation | false |

## Skills

5 AI Agent skill packages are included in the `skills/` directory:

| Skill | Description |
|-------|-------------|
| `ae-analysis` | Unified analysis skill: analysis + audience + metadata + common constraints (project gate/resource links) |
| `ae-engage` | Hermes Engage MCP: channels, tasks, configs, flows, strategies |
| `ae-dataops` | Data warehouse management, task flows, IDE queries, integration, operations |
| `ae-community` | Community analysis: posts, comments, topics, livestreams |

Install them with:

```bash
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## Skill Details

### ae-analysis

Unified AE analysis capabilities:
- **Analysis**: alerts, reports, dashboards, ad-hoc/drilldown, entity/event details, analysis schema
- **Audience**: cluster and tag lifecycle management, plus definition schema tools
- **Metadata**: events/properties, metrics, virtual metadata, project config, tracking plans, mark times
- **Common**: mandatory project ID gate and post-write resource-link completion

### engage

Hermes Engage MCP capabilities:
- **Channels**: channel management, config channels, approval, whitelist
- **Tasks**: task list, details, data/metrics overview, experiment reports
- **Configs**: config items, strategies, comparison, trigger/analysis reports
- **Flows**: flow creation, node config, reports, validation

### ae-dataops

Data warehouse management:
- **Repo Management**: spaces, catalogs, schemas, members
- **Data Tables**: table creation, views, batch operations, data dictionary
- **Task Flows**: flow creation, task nodes, scheduling, execution, monitoring
- **IDE Queries**: metadata browsing, SQL execution, query management
- **Data Integration**: datasource management, sync solutions, data synchronization

### ae-community

Community social media analysis:
- **Posts**: search, detail, corpus tags
- **Comments**: sentiment analysis, tag analysis, summary
- **Topics**: hot topics, trends, daily summaries
- **Livestreams**: rooms, sessions, analysis, metrics
- **Channel Info**: channel overview metrics

## Architecture

ae-cli is built with:
- **TypeScript** (~8000 lines of code)
- **Commander.js** for CLI framework
- **WebSocket** for MCP server integration
- **Node.js** runtime (v18+)

The project structure:
```
src/
├── core/          # Core modules: auth, config, client, mcp
├── framework/     # Framework: types, register, runner, output
├── api/           # Raw API access
└── commands/      # Domain-specific commands
    ├── auth.ts
    ├── config.ts
    ├── te-analysis/
    ├── te-audience/
    ├── te-meta/
    ├── te-engage/
    ├── te-dataops/
    ├── te-community/
    └── te-common/
```

## Verification Scripts

```bash
npm run verify:analysis-tools
npm run verify:analysis-audience-tools
npm run verify:analysis-meta-tools
npm run verify:analysis-common-tools
```

## License

MIT
