[中文版](./README.zh.md) | [English](./README.md)

# ae-cli

`ae-cli` is the command-line client for the ThinkingAI AgenticEngine (AE) platform. It provides stable, structured interfaces for both AI Agents and human operators across analytics, experimentation, metadata, tracking, Engage, DataOps, knowledge bases, Agent resources, and system administration.

The CLI is designed around:

- JSON-first output that Agents can inspect and act on.
- Host-scoped authentication and environment configuration.
- Curated commands for common workflows plus Capability Gateway access for long-tail operations.
- Explicit validation, dry-run, and confirmation contracts for safer writes.
- Exact CLI and Skills version synchronization with the connected AE environment.

## Requirements

- Node.js 20 or later.
- Access to the npm registry for CLI installation.
- Access to GitHub when installing Skills initially or when the local Skills fallback cannot be used.

## Installation

Install the public CLI and Agent Skills:

```bash
npm install -g @thinkingai/ae-cli
npx -y skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

The Skills teach supported coding Agents, including Claude Code, Codex, Cursor, and similar tools, how to discover and call `ae-cli`.

Log in to an AE environment:

```bash
ae-cli auth login --host https://your-ae-host.example.com
ae-cli auth status
```

## Environment-Bound Updates

Each AE environment returns the exact `aeCliVersion` it expects. Use the unified update command to install that CLI version and its matching Skills:

```bash
ae-cli update
ae-cli update --dry-run
```

`ae-cli update` installs the exact version required by the active host rather than npm `latest`. It synchronizes Skills from the installed npm package first and uses the matching GitHub tag only as a fallback.

Starting with the `6.0.37` and `6.1.9` release lines, ordinary business commands can automatically upgrade or downgrade the CLI to the host-required version. After a successful synchronization, the old process exits with `AE_CLI_VERSION_SYNCED`; re-run the original command so it executes with the new CLI and Skills. Installation failures are reported without replacing the business command's JSON output.

Useful controls:

```bash
# Use another configured host
ae-cli update --host https://another-host.example.com

# Install an explicit version
ae-cli update --target 6.1.9

# Skip compatibility checks for one command
ae-cli --no-update-check capability list --domain analysis
```

## Quick Start

```bash
# List and switch configured environments
ae-cli config list
ae-cli config current
ae-cli config use https://your-ae-host.example.com

# Discover capabilities exposed by the host
ae-cli capability list --domain analysis
ae-cli capability search "dashboard list" --domain analysis
ae-cli capability inspect analysis.dashboard.list

# Validate, preview, and execute
ae-cli capability validate analysis.dashboard.list --input '{"project_id":1}'
ae-cli capability dry-run analysis.dashboard.list --input '{"project_id":1}'
ae-cli capability run analysis.dashboard.list --input '{"project_id":1}'

# Filter structured output
ae-cli capability list --domain analysis --jq '.data.capabilities[] | .id'
```

## Command Surface

Run `ae-cli --help` or `ae-cli <command> --help` for the authoritative command list.

| Command or domain | Purpose |
|---|---|
| `analysis` | Reports, dashboards, ad-hoc analysis, drilldowns, details, alerts, and analysis schemas |
| `experiment` | Atlas experiments, reports, traffic layers, buckets, Features, metrics, and operation logs |
| `analysis-meta` | Event/property metadata, metrics, virtual metadata, tracking governance, and project configuration |
| `analysis-governance` | Asset search, lineage, impact analysis, and governance operations |
| `metadata` | Capability-backed data-table and property operations |
| `tracking` | Tracking-plan lifecycle, SDK samples, checks, ingestion diagnostics, code generation, and bundled wiki |
| `engage-flow`, `engage-task`, `engage-setting`, `engage-scene`, `engage-activity`, `engage-workbench` | Engage flows, tasks, settings, strategies, activities, and workbench operations |
| `community` | Community posts, comments, topics, sentiment, livestream, and report workflows |
| `dataops_repo`, `dataops_datatable`, `dataops_flow`, `dataops_ide`, `dataops_integration`, `dataops_operations` | Data warehouse, data-table, flow, IDE, integration, and operations workflows |
| `kb` | Knowledge-base lifecycle, LLM query, and deterministic index/grep/read retrieval |
| `agent` | Agents, automations, models, MCP servers, Skills, attachments, credentials, and sandbox tools |
| `system` | Root/admin operations for members, sandboxes, shared tools, models, usage, quotas, and IM channels |
| `team` | Agent Team lifecycle and TeamRun execution, chat, result, and artifact workflows |
| `capability` | Capability discovery, schema inspection, validation, dry-run, and generic execution |
| `auth`, `config` | Host-scoped authentication and multi-environment configuration |
| `api` | Raw authenticated HTTP requests for diagnostic or transitional use |
| `sync` | Push or pull local Skills and MCPs to/from the Agent application |
| `model` | Switch the current workspace model inside an Agent sandbox |
| `update` | Synchronize CLI and Skills to the version required by the current host |

`analysis_meta` remains available for legacy curated metadata commands. Prefer the hyphenated Capability Gateway domains for new integrations.

## Capability Gateway

Capability Gateway is the preferred entry point for operations that do not need a dedicated curated command:

```bash
ae-cli capability list --domain analysis --project-id 1
ae-cli capability search "report list" --domain analysis
ae-cli capability inspect analysis.report.list
ae-cli capability validate analysis.report.list --input input.json
ae-cli capability dry-run analysis.report.list --input input.json
ae-cli capability run analysis.report.list --input input.json
```

`--input` accepts inline JSON, a JSON file path, `@<path>`, or `-` for stdin.

Use `validate` while fixing complex nested input. Use `dry-run` when you need the final risk, output mode, cancellation support, or delete confirmation preview. Do not stack `validate` and `dry-run` for the same final payload by default; `dry-run` already validates it.

Gateway-backed features follow the [Capability command admission rules](docs/capability-command-admission.md). Common workflows may have curated commands; long-tail capabilities remain dynamically discoverable.

## Authentication and Environments

Credentials are stored per host. Switching environments does not reuse a token from another host.

```bash
ae-cli auth login --host https://host-a.example.com
ae-cli auth status --host https://host-a.example.com
ae-cli auth logout --host https://host-a.example.com

ae-cli config list
ae-cli config current
ae-cli config set-host https://host-b.example.com --label staging
ae-cli config use staging
```

Login uses a cross-platform device-code flow. Use `--no-browser` when the environment cannot open a browser.

## Output and Safety

Commands return a stable envelope:

```json
{
  "ok": true,
  "data": {},
  "_notice": {}
}
```

- `--format json` is the default and is recommended for Agents.
- `--format table` is available for supported human-facing list commands.
- `--jq <expr>` applies jq 1.8 filtering to the business payload before the output envelope is printed.
- `--validate` normalizes Capability Gateway input without business execution.
- `--dry-run` previews an operation without executing its business logic.
- `--yes` skips interactive confirmation for explicitly marked high-risk writes.
- `_notice` may include host compatibility or update guidance without changing successful business data.

JSON flags generally accept inline JSON, `@file`, a file path, or `-` for stdin. Check command help for the exact accepted forms.

## Knowledge Bases

Manage the server-side knowledge-base lifecycle:

```bash
ae-cli kb +new --scope company --name engineering-handbook --description "Team docs"
ae-cli kb +add --name engineering-handbook --files '["./docs/guide.md","https://example.com/page"]'
ae-cli kb +schema --name engineering-handbook
ae-cli kb +compile --name engineering-handbook
ae-cli kb +status --name engineering-handbook
ae-cli kb +query -q "How is the sandbox configured?" --top-k 10
```

External Agents can use deterministic retrieval without a server-side LLM:

```bash
ae-cli kb +list
ae-cli kb +index --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +grep -q "sandbox config" --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +read --source '{"scope":"company","name":"engineering-handbook"}' --path "wiki/sandbox.md"
```

## Agent and System Administration

The `agent` domain manages user-visible Agent resources:

```bash
ae-cli agent +list-agents
ae-cli agent +list-models
ae-cli agent +list-mcps
ae-cli agent +list-skills
ae-cli agent +list-automations
ae-cli agent +list-attachments
```

The `system` domain calls administrative `/api/admin/**` endpoints and requires a `root` or `agent_admin` role:

```bash
ae-cli system +list-members --status enabled
ae-cli system +list-sandboxes
ae-cli system +get-usage-summary --days 30
ae-cli system +list-quota-rules
ae-cli system +list-channels
```

Authorization is always enforced by the server. Do not retry or bypass a permission error.

## Agent Skills

The npm package includes the same `skills/` directory used by the public repository:

| Skill | Scope |
|---|---|
| `ae-capability` | Capability discovery and generic invocation |
| `ae-analysis`, `ae-analysis-global` | Analysis, audience, metadata, governance, and multi-cluster workflows |
| `ae-experiment` | Atlas experiment, Feature, metric, traffic-layer, and report workflows |
| `ae-metadata` | Capability-backed metadata data-table operations |
| `ae-engage` | Engage operations and workflow guidance |
| `ae-dataops` | Data warehouse, flow, IDE, integration, and operations |
| `ae-community` | Community analysis and reporting |
| `ae-kb` | Knowledge-base lifecycle and retrieval |
| `ae-agent`, `ae-system`, `ae-team` | Agent resources, administration, and TeamRun workflows |
| `ae-generate-tracking-plan`, `ae-generate-tracking-code` | Tracking-plan and tracking-code generation |
| `ae-data-integration-helper` | SDK and LogBus2 integration guidance |

Reinstall all public Skills with:

```bash
npx -y skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## Development

```bash
git clone https://github.com/ThinkingAIAgenticEngine/ae-cli.git
cd ae-cli
npm install
npm run build
node dist/index.js --help
```

Run from source during development:

```bash
npm run dev -- --help
```

Core structure:

```text
src/
├── core/          # auth, config, clients, compatibility, version sync
├── framework/     # command registration, lifecycle, output, errors
├── api/           # raw authenticated API access
└── commands/      # business domains and CLI utilities
skills/            # Agent Skills shipped with the npm package
self-check/        # release and documentation consistency checks
test/, tests/      # command, contract, and regression tests
```

Useful verification commands:

```bash
npm run build
npm run qa-changed
npm run self-check
npm run check:release
npm run verify:experiment-tools
npm run verify:update-check
npm run verify:version-sync
```

## Changelog

- [English changelog](./CHANGELOG.md)
- [中文更新日志](./CHANGELOG.zh-CN.md)

## License

MIT
