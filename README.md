
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
ae-cli auth login --host xxxxx
```

## Usage

```bash
# AE meta domain (metadata and governance)
ae-cli analysis_meta +list_events --project_id 1

# Table output
ae-cli analysis_meta +list_events --project_id 1 --format table

# Raw API call
ae-cli api GET /v1/ta/event/catalog/listEvent --params '{"projectId": 1}'

# Knowledge base (create → upload → compile → query)
ae-cli kb +new --scope company --name engineering-handbook --description "Team docs"
ae-cli kb +add --name engineering-handbook --files '["./docs/guide.md","https://example.com/page"]'
ae-cli kb +schema --name engineering-handbook
ae-cli kb +compile --name engineering-handbook
ae-cli kb +query -q "How to configure sandbox?" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]'

# Retrieval primitives for external agents (read index → grep → read page)
ae-cli kb +index --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +grep -q "sandbox config" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +read --source '{"scope":"company","name":"engineering-handbook"}' \
  --path "wiki/sandbox.md"
```

## Authentication

Authentication is handled per-host. Each AE host URL maintains its own token.

```bash
# Device code login (cross-platform)
ae-cli auth login

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
| `dataops_repo` | 1 | DataOps repo utilities: space discovery |
| `dataops_datatable` | 5 | Data tables: table/view creation, publishing, details, data dictionary |
| `dataops_flow` | 15 | Task flows: flow creation, task nodes, scheduling, execution, release preview |
| `dataops_operations` | 4 | Operations: workflow instance search, instance detail, task logs, stop |
| `dataops_ide` | 9 | IDE queries: metadata browsing, SQL execution, query management |
| `dataops_integration` | 19 | Data integration: datasource management, sync solutions, data synchronization |
| `community` | 10+ | Community analysis: posts search, sentiment analysis, topic trends, livestream data |
| `analysis_common` | 2 | Cross-module common constraints: resource link completion, project ID gate |
| `team` | 14 | AI Agent Team: manage teams (list/create/update/delete/ai-generate/templates/projects) and execute TeamRuns (start/watch/chat/reply/cancel/result/artifacts) |
| `kb` | 10 | Knowledge base lifecycle: query / new / add (md/dir/url) / schema / compile / rm-source / remove; retrieval primitives: index / grep / read |
| `auth` / `config` | 2 | Authentication and host configuration |

### kb

Knowledge base lifecycle (`+new` → `+add` → `+schema` → `+compile` → `+status` → `+query`):

- **Create** (`+new`): `--scope personal|company`, `--name`, optional `--description`, `--tags`, `--project-id`, `--project-name`
- **Upload** (`+add`): `--name`, `--files` JSON array (`.md` file, directory non-recursive scan, or http(s) URL with HTML-to-Markdown conversion)
- **Schema** (`+schema`): `--name`, optional `--force`, `--model`
- **Compile** (`+compile`): `--name`, `--mode incremental|full` (default: incremental)
- **Status** (`+status`): `--name`
- **Query** (`+query`): `--query` / `-q`, `--sources` JSON refs e.g. `[{"scope":"company","name":"engineering-handbook"}]`
- **Remove source** (`+rm-source`): `--name`, `--display-name`
- **Remove KB** (`+remove`): `--name`

Retrieval primitives for external agents (`+index` → `+grep` → `+read`); these are deterministic file-search endpoints with no server-side LLM, designed for agents (Claude Code / Codex / Cursor) to explore a KB the way they explore a codebase:

- **Index** (`+index`): optional `--sources` JSON refs (omit to list all accessible KBs), optional `--locale`. Returns each KB's metadata plus its `index.md` navigation map.
- **Grep** (`+grep`): `--query` / `-q`, optional `--sources`, `--top-k` (1-50, default 10), `--locale`. Returns matched lines with path, line number, breadcrumb and context snippet.
- **Read** (`+read`): `--source` JSON ref (exactly one KB), `--path` (page path relative to the KB root), optional `--offset` / `--limit` (line window), `--locale`. Returns the full page or a line window.

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--host <url>` | Override active AE host URL | from config |
| `--format <json\|table>` | Output format | json |
| `--jq <expr>` | Filter expression | - |
| `--dry-run` | Preview request | false |
| `--yes` | Skip confirmation | false |
| `--no-update-check` | Skip checking for newer ae-cli versions | false |

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
- **Repo Utilities**: space discovery
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
    ├── te-common/
    └── te-kb/
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
