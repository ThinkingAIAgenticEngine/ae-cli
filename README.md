# ae-cli

CLI tool for ThinkingAI AgenticEngine (AE) platform. Designed for both AI Agent and human use.

## Installation

**Step 1: Install ae-cli**

```bash
npm install -g @thinking-ai/ae-cli
```

**Step 2: Install AI Agent Skills**

```bash
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

This installs 8 skill packages into your AI coding agent (Claude Code, Trae, Cursor, etc.), enabling the agent to understand and call ae-cli commands.

To update:

```bash
npm cache clean --force && npm install -g @thinking-ai/ae-cli
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## Quick Start

```bash
# First run — interactive host setup + auto-login
ae-cli config
```

The `config` command opens an interactive terminal UI:
- First run: prompts you to add a TE host URL and label, then auto-authenticates
- Subsequent runs: shows all configured hosts, lets you switch, edit, delete, or add new ones

```
TE Host Manager  (↑↓ select · Enter switch · e edit label · d delete · a add · q quit)

❯ ● Production  https://ta.thinkingdata.cn  ✓
  ○ Staging     https://ta-staging.example.com:8080  ✗
  + Add new host...
```

After selecting a host, ae-cli automatically checks if the token is valid. If not, it triggers `auth login` for you.

## Usage

```bash
# TE meta domain (metadata and governance)
ae-cli te_meta +list_events --project_id 1

# Table output
ae-cli te_meta +list_events --project_id 1 --format table
```

## Authentication

Authentication is handled per-host. Each TE host URL maintains its own token.

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
| `te_analysis` | 31 | Analysis workflows: alerts, reports, dashboards, ad-hoc/drilldown, clusters/tags, metadata/metrics, project tools, entity details, analysis schema |
| `te_audience` | 14 | Audience operations: clusters, tags, and cluster/tag definition schema |
| `te_meta` | 20 | Metadata governance: events/properties, metrics, virtual metadata, project config, tracking plan, mark times, resource links |
| `te_engage` | 40+ | Hermes Engage MCP: channels, tasks, configs, flows, strategies |
| `te_dataops` | 50+ | Data warehouse management: repos, datatables, flows, IDE queries, integration, operations |
| `te_community` | 30+ | Community analysis: posts search, sentiment analysis, topic trends, livestream data |
| `te_common` | 2 | Cross-module common constraints: resource link completion, project ID gate |
| `operation` | 11 | Tasks, flows, channels, space navigation |

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--host <url>` | Override active TE host URL | from config |
| `--format <json\|table>` | Output format | json |
| `--jq <expr>` | Filter expression | - |
| `--dry-run` | Preview request | false |
| `--yes` | Skip confirmation | false |

## Skills

8 AI Agent skill packages are included in the `skills/` directory:

| Skill | Description |
|-------|-------------|
| `te-shared` | Authentication, configuration, global options |
| `te-analysis` | Alerts, reports, dashboards, ad-hoc/drilldown, entity details, analysis schema |
| `te-audience` | Cluster and tag lifecycle management |
| `te-meta` | Metadata governance, project config, tracking plan, and resource link operations |
| `te-engage` | Hermes Engage MCP: channels, tasks, configs, flows, strategies |
| `te-dataops` | Data warehouse management, task flows, IDE queries, integration, operations |
| `te-community` | Community analysis: posts, comments, topics, livestreams |
| `te-common` | Cross-module constraints: project ID gate, resource link completion |

Install them with:

```bash
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## Skill Details

### te-analysis (31 tools)

Analysis query and visualization capabilities:
- **Alerts**: view, create, update alert definitions
- **Reports & Dashboards**: create, query, update reports and dashboards
- **Model Analysis**: event analysis, retention analysis, funnel analysis, SQL analysis, user property analysis, distribution analysis, interval analysis, path analysis, attribution analysis
- **Entity/Event Details**: query details, generate analysis SQL
- **Schema Helpers**: analysis query schema, filter schema, groupby schema

### te-audience (14 tools)

Audience operations and targeting:
- **Clusters**: create, update, query, member inspection, recomputation
- **Tags**: create, update, query, member inspection, recomputation
- **Schema Definitions**: cluster/tag definition schemas

### te-meta (20 tools)

Metadata and tracking-plan governance:
- **Metadata Governance**: events/properties, metrics, virtual metadata
- **Project Configuration**: project config, project users
- **Tracking Plans**: track program management
- **Mark Times**: date markers management
- **Entity Catalog**: entity listing

### te-engage (40+ tools)

Hermes Engage MCP capabilities:
- **Channels**: channel management, config channels, approval management
- **Tasks**: task list, task details, task data/metrics overview, experiment reports
- **Configs**: config items, strategies, strategy comparison, trigger/analysis reports
- **Flows**: flow creation, node config, flow reports, flow validation

### te-dataops (50+ tools)

Data warehouse management:
- **Repo Management**: spaces, catalogs, schemas, members
- **Data Tables**: table creation, views, batch operations, data dictionary
- **Task Flows**: flow creation, task nodes, scheduling, execution, monitoring
- **IDE Queries**: metadata browsing, SQL execution, query management
- **Integration**: datasource management, sync solutions, data synchronization
- **Operations**: flow instances, task instances, backfill jobs

### te-community (30+ tools)

Community social media analysis:
- **Posts**: search, detail, corpus tags
- **Comments**: sentiment analysis, tag analysis, summary
- **Topics**: hot topics, trends, daily summaries
- **Livestreams**: rooms, sessions, analysis, metrics
- **Advanced Analysis**: activity analysis, character analysis, weekly reports, release analysis

### te-common (2 tools)

Cross-module common constraints:
- **Project ID Gate**: mandatory project verification before execution
- **Resource Link Completion**: post-write link generation for dashboards, reports, metrics, alerts, clusters, tags

## Development

```bash
git clone https://github.com/ThinkingAIAgenticEngine/ae-cli.git
cd ae-cli
npm install
npx tsx src/index.ts --help
```

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
    ├── community/
    └── te-common/
```

## Verification Scripts

```bash
npm run verify:te-analysis-tools
npm run verify:te-audience-tools
npm run verify:te-meta-tools
npm run verify:te-common-tools
```

## License

MIT