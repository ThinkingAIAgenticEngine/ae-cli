[中文版](./README.zh.md) | [English](./README.md)

# ae-cli

`ae-cli` is the command-line client for the ThinkingAI AgenticEngine (AE) platform. It provides stable, structured interfaces for both AI Agents and human operators across analytics and project configuration, metadata, tracking, local-data ingestion, Engage, DataOps, knowledge bases, Agent resources, user memory, and system administration.

The CLI is designed around:

- JSON-first output that Agents can inspect and act on.
- Host-scoped authentication and environment configuration.
- Curated commands for common workflows plus Capability Gateway access for long-tail operations.
- Explicit validation, dry-run, and confirmation contracts for safer writes.
- Exact CLI and Skills version synchronization with the connected AE environment.

## Requirements

- Node.js 20 or later.
- Access to the ThinkingData internal npm registry.
- Access to the internal `te-ai/te-cli` Git repository for Skills and source development.

## Installation

Install the internal CLI and Agent Skills:

```bash
npm install -g @tant/ae-cli --registry=https://npm.thinkingdata.cn:3443
npx -y skills add http://10.27.249.150:8888/te-ai/te-cli.git#release/6.0 te-ai/ae-cli -g -y
```

The Skills teach supported coding Agents, including Claude Code, Codex, Cursor, and similar tools, how to discover and call `ae-cli`.

Install optional, approved scenario Skills with an interactive category picker:

```bash
npx skills@latest add ThinkingAIAgenticEngine/scenario-skills
```

See the [scenario-skills repository](https://github.com/ThinkingAIAgenticEngine/scenario-skills) for version-specific and non-interactive installation.

Log in to an AE environment:

```bash
ae-cli auth login --host https://your-ae-host.example.com
ae-cli auth status
```

Use the AE URL supplied by your AgenticEngine administrator. If no Host is configured, `ae-cli` guides existing customers to obtain that URL first. Only users without an AgenticEngine environment are directed to [request a trial](https://thinkingai.cn/request-demo).

## Open-Source Environment Updates

Customer environments return the exact `aeCliVersion` they expect. The public `@thinkingai/ae-cli` distribution uses the unified update command to install that CLI version and its matching Skills:

```bash
ae-cli update
ae-cli update --dry-run
```

`ae-cli update` installs the exact public version required by the active host rather than npm `latest`. It synchronizes Skills from the installed npm package first and uses the matching GitHub tag only as a fallback.

Starting with the `6.0.37` and `6.1.9` release lines, ordinary business commands in the public package can automatically upgrade or downgrade the CLI to the host-required version. After a successful synchronization, the old process exits with `AE_CLI_VERSION_SYNCED`; re-run the original command so it executes with the new CLI and Skills. Installation failures are reported without replacing the business command's JSON output.

The internal `@tant/ae-cli` package is excluded from automatic global replacement. Internal development builds should be updated through the internal npm registry and internal Skills source shown in [Installation](#installation).

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
# Open the interactive environment manager
ae-cli config

# Or manage environments non-interactively
ae-cli config list
ae-cli --format table config list
ae-cli config current
ae-cli config add https://your-ae-host.example.com --label production --use
ae-cli config use production

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

## Command Map

The table covers every current root command individually. Use `ae-cli --help` for root commands and `ae-cli <command> --help` for the next resource or operation; append `--help` at deeper levels, for example `ae-cli project member --help`. Discover server-provided operations with `ae-cli capability list|search|inspect`.

<!-- root-command-surface:start -->
| Category | Root command | Purpose |
|---|---|---|
| Analysis and projects | `analysis` | Reports, dashboards, ad-hoc analysis, drilldowns, details, alerts, tags, and cohorts |
| Analysis and projects | `analysis-meta` | Event/property catalogs, metrics, virtual metadata, tracking governance, and project analysis settings |
| Analysis and projects | `analysis-governance` | Data-asset search, lineage, impact analysis, certification, and governance |
| Analysis and projects | `project` | Project information, members, roles, permissions, entities, time zones, and handover settings |
| Analysis and projects | `metadata` | Capability-backed data-table, property, and dimension-table binding operations |
| Analysis and projects | `personal-semantic-preference` | Project-scoped lightweight semantic preferences for the current user |
| Analysis and projects | `project-semantic` | Export project asset packages for knowledge-base builds |
| Data and tracking | `tracking` | Tracking plans, SDK samples, checks, ingestion diagnostics, code generation, and bundled wiki |
| Data and tracking | `data-integration` | Inspect, plan, convert, upload, hand off, and reuse local CSV/JSON/Excel data |
| Community insights | `community` | Community posts, comments, topics, sentiment, livestream, and report workflows |
| Engage | `engage-flow` | Engage flow management |
| Engage | `engage-task` | Engage task and delivery-content management |
| Engage | `engage-setting` | Channel, audience, and Engage settings |
| Engage | `engage-scene` | Engage scene and strategy management |
| Engage | `engage-activity` | Activity, topic, and related task management |
| Engage | `engage-workbench` | Engage workbench and to-do management |
| Engage | `engage-query` | Engage queries, asynchronous exports, and artifact management |
| DataOps | `dataops_repo` | Data-warehouse and data-source management |
| DataOps | `dataops_datatable` | Data-table lifecycle management |
| DataOps | `dataops_flow` | Development flows, scheduling, and backfill-job management |
| DataOps | `dataops_ide` | IDE queries and result downloads |
| DataOps | `dataops_integration` | Data-integration task management |
| DataOps | `dataops_operations` | Operations, monitoring, and alert workflows |
| Agent platform | `kb` | Knowledge-base lifecycle, LLM Q&A, and deterministic index/grep/read retrieval |
| Agent platform | `agent` | Agents, approvals, automations, models, MCP servers, Skills, attachments, credentials, and sandbox tools |
| Agent platform | `context` | Read the current product-page context authorized for the active Agent Run |
| Agent platform | `memory` | User memory, Top-K context writing, and actual-usage accounting |
| Agent platform | `team` | Agent Team and TeamRun execution, chat, results, and artifacts |
| Agent platform | `system` | Root/admin management of members, sandboxes, tools, models, usage, quotas, and channels |
| General tools | `capability` | Capability discovery, schema inspection, validation, dry-run, and generic execution |
| General tools | `auth` | Host-scoped login, status, and multi-account management |
| General tools | `config` | Add, switch, rename, and remove Host environments |
| General tools | `sync` | Push or pull local Skills and MCPs to/from the Agent application |
| General tools | `model` | Inspect and switch the current workspace model inside an Agent sandbox |
| General tools | `update` | Synchronize CLI and Skills to the version required by the current Host |
<!-- root-command-surface:end -->

### Cross-source asset configurations

Cross-source configuration uses a deliberately small **L3 dynamic workflow**. The backend exposes only workbook upload, configuration listing, validation submission, and validation-result reads. It does not expose row-by-row create/update/delete or template/export operations.

```bash
ae-cli capability search "cross_source_config" --domain metadata --project-id 1
ae-cli capability inspect metadata.cross_source_config.upload --project-id 1
ae-cli analysis input-file purpose list --project-id 1
ae-cli analysis input-file upload --project-id 1 --purpose cross_source_config.workbook --file ./configured.xlsx
ae-cli capability run metadata.cross_source_config.upload --input '{"project_id":1,"input_file_id":"<input_file_id>","lang":"zh"}' --yes
ae-cli capability run metadata.cross_source_config.list --input '{"project_id":1}'
ae-cli capability run metadata.cross_source_config.check --input '{"project_id":1,"ids":[101]}'
ae-cli capability run metadata.cross_source_config.check_status --input '{"project_id":1,"ids":[101]}'
```

Upload reuses the Asset Center page's synchronous Excel import service and may update configurations whose route codes already exist, so it requires `--yes`. Responses include `page_path`; ae-cli adds a Host-qualified `page_url` that can be opened for visual review. See the [cross-source workflow guide](skills/ae-analysis/references/cross_source_config.md).

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

`analysis user-tag create|update` supports periodic refresh in one command: pass `--auto-refresh-schedule '{"frequency":"daily","time":"02:30"}'` (also weekly/monthly), or `--auto-refresh-cron`. Use `--enable-auto-refresh false` to disable it. Scheduling-only updates do not recompute; omitted settings preserve the existing plan. See the [tag create](skills/ae-analysis/references/user_tag_create.md) and [tag update](skills/ae-analysis/references/user_tag_update.md) references.

## Authentication and Environments

Credentials are stored per host. Switching environments does not reuse a token from another host.
Run `ae-cli config` in a terminal to add, activate, rename, or remove environments interactively.
Run `ae-cli auth` to choose the active account for the current host interactively. `ae-cli auth use` opens the same selector when `--account` is omitted.
For scripts and agents, use the non-interactive subcommands:

```bash
ae-cli auth login --host https://host-a.example.com
ae-cli auth status --host https://host-a.example.com
# For the uncommon case where one host needs multiple accounts
ae-cli auth login --host https://host-a.example.com --add
ae-cli auth list --host https://host-a.example.com
ae-cli auth use --host https://host-a.example.com --account <login-name-or-open-id>
ae-cli auth logout --host https://host-a.example.com
ae-cli auth logout --host https://host-a.example.com --all

ae-cli config list
ae-cli config current
ae-cli config add https://host-b.example.com --label staging
ae-cli config use staging
ae-cli config rename staging pre-production
ae-cli config remove pre-production --yes
```

`<env>` accepts either an exact URL or a unique label. The active environment is clearly marked in the interactive manager and in `config list`. Removing an active environment is rejected while other environments remain; switch first so replacement is explicit. `config set-host` remains available as a compatibility command that adds or updates a host and activates it.

A regular `auth login` keeps the simple one-host/one-account behavior and replaces credentials for that host; use `--add` only when other accounts must be retained. `auth status` reports CLI-token state only. A new backend can also provide account identity and expiration; when an older backend does not support `/validate`, the CLI preserves the historical behavior of trusting the stored CLI token and omits `account` instead of returning null fields.

The new CLI persists only CLI tokens, never access or refresh tokens. Multiple accounts live in an encrypted V1 vault while the active account is projected into the historical file shape for automatic downgrades. When the CLI upgrades again, it reconciles login, switch, or logout changes made by the old CLI.

Login uses a cross-platform device-code flow. Use `--no-browser` when the environment cannot open a browser.
Trial guidance is emitted only when no Host is configured; normal commands and authentication flows for configured environments do not display it.

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

ZIP directory sources support upload with `kb +add`, child listing with `kb +source-ls`,
raw file reading with `kb +source-read`, revision-checked add/replace with `kb +source-put`,
and child file/directory deletion with `kb +source-rm`. See the
[ZIP source workflow](skills/ae-kb/SKILL.md#zip-directory-sources) for flags and incremental compilation.
`kb +import` remains the separate read-only compiled snapshot workflow.

`kb source replace` and `kb source restore` update file/ZIP source drafts. ZIP changes use
`kb source preview`, `kb source commit`, and `kb source cancel` for explicit review.
They do not publish or roll back the whole knowledge base. See the
[source replacement and restore workflow](skills/ae-kb/references/source-mutations.md).

Manage the server-side knowledge-base lifecycle:

```bash
ae-cli kb +new --scope company --name engineering-handbook --description "Team docs"
ae-cli kb +import --scope company --file ./knowledge-base.zip --name "Imported handbook"
ae-cli kb +import-status --request-id <requestId>
ae-cli kb +add --name engineering-handbook --scope company --files '["./docs/guide.md","https://example.com/page"]'
ae-cli kb +list-sources --name engineering-handbook --scope company
ae-cli kb +rm-source --name engineering-handbook --scope company --id <source-id>
# Legacy compatibility when a source ID is unavailable:
ae-cli kb +rm-source --name engineering-handbook --scope company --display-name kb-1780046712-guide.md
ae-cli kb +schema --name engineering-handbook --scope company --model <model-ref>
ae-cli kb +compile --name engineering-handbook --scope company --model <model-ref>
ae-cli kb +status --name engineering-handbook --scope company
ae-cli kb +ask -q "How is the sandbox configured?"
# Submit only, poll later:
ae-cli kb +ask -q "Another question" --no-wait
ae-cli kb +ask-status --execution-id <id>
```

`kb +list-sources` returns stable source `id` values. Copy the exact `id` into
`kb +rm-source`; do not guess it from a filename or URL. The `--display-name`
selector remains available only for legacy compatibility when an ID is unavailable.
Name-based management commands accept optional `--scope personal|company`; omit it to keep the legacy personal-to-company lookup. For Schema and Compile, prefer the model record `id` from `ae-cli agent +list-models`; historical `modelId` and `modelId::scope` remain compatible, while `displayName` is not a stable reference.

`kb +import` accepts `--scope personal|company` (default `personal`) and a compiled Markdown ZIP
up to 50 MB with root `index.md` and `wiki/**/*.md` pages. It stores the upload as an asynchronous
task and returns `{requestId, status: "queued", scope}` immediately; use
`ae-cli kb +import-status --request-id <requestId>` to read `queued`, `running`, `succeeded`, or
`failed`. A succeeded task includes the persisted `scope` and `knowledgeBaseId`, after which the
read-only snapshot is available to list, Index/Wiki, grep/read, Ask, and delete operations.
Source, Schema, usage, and compile operations are unavailable; company snapshots retain the
caller's company-governance permissions. Company scope requires a company-bound root or
agent_admin account. The server performs the complete archive and Wiki-link validation in the
background.

External Agents can use deterministic retrieval without a server-side LLM:

```bash
ae-cli kb +list
ae-cli kb +index --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +grep -q "sandbox config" --sources '[{"scope":"company","name":"engineering-handbook"}]' --paths '["wiki/sandbox.md"]'
ae-cli kb +read --source '{"scope":"company","name":"engineering-handbook"}' --path "wiki/sandbox.md" --limit 2000 --expand block
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
ae-cli agent approval-type list
ae-cli agent approval-request list --status pending
ae-cli agent approval-task list --status pending
ae-cli agent approval-effect list --status manual_required
```

Generic approval commands use versioned CLI-token REST under the Agent application's `/agent` base path. Use `approval-type get` before submitting type-specific snake_case payloads. Effect retry is a `high-risk-write` and requires an auditable reason plus explicit `--yes`. Write-command `--dry-run` output is a local request preview only; it does not verify server permissions, current state, or future conditional routing.

Agent sharing and company publication:

```bash
ae-cli agent share recipients --query Alice
ae-cli agent bundle preview --agent-id <agent-id>
ae-cli agent share create --agent-id <agent-id> --to-user-ids '["<user-id>"]' --client-request-id <unique-id>
ae-cli agent share list --direction received --status pending
ae-cli agent share accept --share-id <share-id> --expected-version <version> --client-request-id <unique-id>
ae-cli agent approval-type get --approval-type-id agent.publish@1
ae-cli agent approval-request submit --approval-type-id agent.publish@1 --resource-id <agent-id> --reason "Publish this Agent" --payload '{"description":"Company assistant"}' --client-request-id <unique-id>
ae-cli agent submission preview --approval-request-id <request-id>
```

Requires the Agent distribution CLI backend routes. Share creation reports per-recipient outcomes, including partial failures. Agent and personal Skill snapshots are immutable; company publication reuses the generic approval workflow. See [Agent distribution](skills/ae-agent/references/agent-distribution.md) for rejection, cancellation, dependency rules, pagination, and safe recovery.

The `system` domain calls administrative `/api/admin/**` and versioned channel `/api/cli/channel/v1/**` endpoints and requires a `root` or `agent_admin` role:

```bash
ae-cli system +list-members --status enabled
ae-cli system +list-sandboxes
ae-cli system +get-sandbox-config
ae-cli system +get-usage-summary --days 30 --refresh true
ae-cli system +export-usage --start-date 2026-07-01 --end-date 2026-07-31 --group-by user --output ./system-usage.csv
ae-cli system +list-quota-rules
ae-cli system +list-channels
ae-cli system channel routing get --endpoint-id <endpoint-id>
ae-cli --dry-run system +bind-feishu-users --channel-id <channel-id> --endpoint-id <endpoint-id> --bindings @bindings.json
ae-cli system +list-sandbox-tools
```

The system domain now exposes 71 commands across members, sandboxes, shared sandbox tools, models and pricing, usage drill-down/CSV export, cost controls, quotas, and channels. Channel management covers nine channel types, endpoint routing, WhatsApp Web QR linking, and 1-100 item Feishu binding batches with per-item results and optional default/per-user Agent assignment. CSV exports stream to a required local path, never overwrite an existing file, and remove partial files on failure.

Authorization and company/resource ownership are always enforced by the server. A missing CLI command is not an access-control boundary: an Agent with Bash/network access can still construct HTTP requests. Do not retry or bypass a permission error, do not use excluded internal member-delete or sandbox-orchestration routes, and obtain explicit user confirmation before every administrative write. Skill instructions, dry-run, and the CLI confirmation prompt are safeguards against mistakes, not substitutes for server authorization; `--yes` bypasses that prompt.

## Agent Skills

The npm package includes the same `skills/` directory used by the public repository:

| Skill | Scope |
|---|---|
| `ae-capability` | Capability discovery and generic invocation |
| `ae-analysis`, `ae-analysis-global` | Analysis, audience, metadata, governance, and multi-cluster workflows |
| `ae-metadata` | Capability-backed metadata data-table operations |
| `ae-engage` | Engage operations and workflow guidance |
| `ae-dataops` | Data warehouse, flow, IDE, integration, and operations |
| `ae-community` | Community analysis and reporting |
| `ae-data-integration` | Local CSV/JSON/Excel inspection, mapping, conversion, upload, and reusable handoff |
| `ae-kb`, `ae-kb-discovery` | Knowledge-base lifecycle, candidate discovery, retrieval, and knowledge-guided business analysis |
| `ae-agent`, `ae-system`, `ae-team` | Agent resources and user memory, administration, and TeamRun workflows |
| `ae-current-context` | On-demand reading of the current Run-bound page context, routed by `kind` and `schemaVersion` |
| `ae-generate-tracking-plan`, `ae-generate-tracking-code` | Tracking-plan and tracking-code generation |
| `ae-data-integration-helper` | SDK and LogBus2 integration guidance |

Reinstall the internal Skills with:

```bash
npx -y skills add http://10.27.249.150:8888/te-ai/te-cli.git#release/6.0 te-ai/ae-cli -g -y
```

## Development

```bash
git clone ssh://git@gitlab.thinkingdata.cn:2222/te-ai/te-cli.git
cd te-cli
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
└── commands/      # business domains and CLI utilities
skills/            # Agent Skills shipped with the npm package
self-check/        # release and documentation consistency checks
test/, tests/      # command, contract, and regression tests
```

Useful verification commands:

```bash
npm run build
npm test
npm run qa-changed
npm run self-check
npm run check:release
npm run verify:readme
npm run verify:auth-credentials
npm run verify:update-check
npm run verify:version-sync
```

## Changelog

- [English changelog](./CHANGELOG.md)
- [中文更新日志](./CHANGELOG.zh-CN.md)

## License

MIT
