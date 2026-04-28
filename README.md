
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
| `analysis` | 31 | Analysis workflows: alerts, reports, dashboards, ad-hoc/drilldown, clusters/tags, metadata/metrics, project tools, entity details, analysis schema |
| `analysis_audience` | 14 | Audience operations: clusters, tags, and cluster/tag definition schema |
| `analysis_meta` | 20 | Metadata governance: events/properties, metrics, virtual metadata, project config, tracking plan, mark times, resource links |
| `engage` | 40+ | Hermes Engage MCP: channels, tasks, configs, flows, strategies |
| `te_dataops` | 50+ | Data warehouse management: repos, datatables, flows, IDE queries, integration, operations |
| `te_community` | 30+ | Community analysis: posts search, sentiment analysis, topic trends, livestream data |
| `analysis_common` | 2 | Cross-module common constraints: resource link completion, project ID gate |
| `operation` | 11 | Tasks, flows, channels, space navigation |

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

### ae-analysis (67 tools)

Unified AE analysis capabilities:
- **Alerts**: view, create, update alert definitions
- **Reports & Dashboards**: create, query, update reports and dashboards
- **Model Analysis**: event analysis, retention analysis, funnel analysis, SQL analysis, user property analysis, distribution analysis, interval analysis, path analysis, attribution analysis
- **Audience**: cluster and tag lifecycle management, plus definition schema tools
- **Metadata Governance**: events/properties, metrics, virtual metadata, project config, tracking plans, mark times, entity catalog
- **Common Constraints**: mandatory project ID gate and post-write resource-link completion
- **Entity/Event Details**: query details, generate analysis SQL
- **Schema Helpers**: analysis query schema, filter schema, groupby schema

### engage (40+ tools)

Hermes Engage MCP capabilities:
- **Channels**: channel management, config channels, approval management
- **Tasks**: task list, task details, task data/metrics overview, experiment reports
- **Configs**: config items, strategies, strategy comparison, trigger/analysis reports
- **Flows**: flow creation, node config, flow reports, flow validation

### ae-dataops (50+ tools)

Data warehouse management:
- **Repo Management**: spaces, catalogs, schemas, members
- **Data Tables**: table creation, views, batch operations, data dictionary
- **Task Flows**: flow creation, task nodes, scheduling, execution, monitoring
- **IDE Queries**: metadata browsing, SQL execution, query management
- **Integration**: datasource management, sync solutions, data synchronization
- **Operations**: flow instances, task instances, backfill jobs

### ae-community (30+ tools)

Community social media analysis:
- **Posts**: search, detail, corpus tags
- **Comments**: sentiment analysis, tag analysis, summary
- **Topics**: hot topics, trends, daily summaries
- **Livestreams**: rooms, sessions, analysis, metrics
- **Advanced Analysis**: activity analysis, character analysis, weekly reports, release analysis

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
