### 6.0.33
**Date:** 2026-07-21

**Changes:**

* Add host version compatibility check (soft tip when local CLI drifts from cluster `te_module_version`); surface tips via `meta._notice` for Agent skills
* Add community chat analysis and community data-report capabilities (including standard v5 report workflow and skill guardrails)
* Add tracking-plan and alert capability commands; fix related plan import / tracking-client / property-get contracts
* Support project-scoped capability discovery (`capability list/search` by project)
* Improve `generate-tracking-plan`: start from an existing plan file, refine event-tag logic, and improve archived xlsx layout
* Align analysis timezone / audience validation and effective-timezone contracts; distinguish dashboard vs BI-panel create routes
* Document Feishu credentials (`app_id` / `app_secret` / `webhook`) for dashboard daily-report send/update
* Preserve long decimals as strings in JSON parsing to avoid precision loss
* Register missing knowledge-base `+url` command; complete high-risk confirmation docs for alert / check / plan delete
* Drop `--yes` from write-only engage activity skill examples

### 6.0.32
**Date:** 2026-07-20

**Changes:**

#### CLI architecture
* Prefer `AE_CLI_CAPABILITY_GATEWAY_DOMAIN*` env when resolving capability gateway domain (overrides call-site default)
* Validate flags before high-risk confirmation; reject illegal boolean values with a unified JSON error
* Align asset-governance capabilities with the new gateway surface and remove superseded legacy CLI entry points

#### Analysis
* CLI-ize report capabilities and align drilldown / detail command contracts with Agent docs
* Add project-management capability commands and related bug fixes
* Clarify cluster/tag auto-compute status in audience docs; fix `ai_models` skill guidance

#### Engage
* Add engage-setting / engage-scene / activity / workbench capability commands and skill docs
* Add `engage-scene config-item list`; re-enable temporarily disabled engage-task commands; regroup ops tasks under `task`
* Change engage-flow operation-log query to `--flow-id`; make config-channel `--config` optional and document `channel_type` / config constraints
* Harden channel test-send errors, common-metric empty-QP checks, client-param display-name defaults, and config-table save upload hints
* Expand activity topic/task/copy/approval docs (rich-text TEXT fields, reject reason, whitelist verify risk)

#### Knowledge base & DataOps
* Add knowledge-base list command
* Unify DataOps SQL download authentication

### 6.0.31
**Date:** 2026-07-16

**Changes:**

#### CLI architecture
* Route more domains through capability gateway; add `capability --validate` and keep `--dry-run` as server-side pre-check only
* Replace custom `--jq` path walker with real `jq-wasm` for stable JSON filtering
* Improve Agent error hints, request dispatch guidance, and illegal numeric flag rejection (avoid NaN → null gateway noise)
* Add release-gate skill frontmatter check so `npx skills add` fails fast on unquoted YAML `description`
* Temporarily hide unfinished commands; retire gateway-superseded legacy analysis command entry points

#### Analysis
* CLI-ize report/dashboard/adhoc/detail/audience flows: unified run/export routes, drilldown, artifact download, and AI QP contracts
* Merge analysis skills into a single indexed surface (`command_index`) and align Agent contracts with capability gateway schemas
* Move asset governance capabilities to `analysis-governance` (list/search/lineage/impact/batch ops) and fix related governance bugs
* Complete user-analysis CLI (cluster/tag members, history-tag drilldown, definition build) and ID-file import contracts
* Remove old `analysis_audience` / detail MCP fallback commands already covered by gateway; sync tracking-plan upload `lang` and built-in i18n

#### Engage
* Register engage capability gateway route and restore/restructure engage CLI + skill docs
* Add flow version list, flow/task operation-log query, test-run, and push-record query (with local date-range validation)
* Add channel touch-limits L2 command and engage-task P0 set (segment-list / group / metric / race / ops / channel-ref)
* Temporarily disable 4 unfinished engage-task write commands to avoid unsafe Agent writes

### 6.0.30
**Date:** 2026-07-14

**Changes:**

* Fix Skill Hub YAML frontmatter parse errors by quoting `description` in tracking-code, tracking-plan, and data-integration-helper skills
* Add self-check guard for unquoted skill descriptions that contain `: `

### 6.0.29
**Date:** 2026-07-13

**Changes:**

* Add capability gateway discovery commands (`capability list/search/inspect/dry-run/run`) with `ae-capability` skill and command-admission docs for long-tail capabilities
* Migrate project-space and folder create/delete/share/members mutations to L3 capability flows; remove curated L2 commands
* Align CLI risk levels with lark-cli three-tier model (`read` / `write` / `high-risk-write`) and tighten delete confirmation behavior
* Route data-management capabilities to `analysis-meta` domain; fix metric, virtual-property, and super-metadata import CLI input contracts
* Sync analysis and audience CLI contracts: ten ad-hoc QP builders, cluster-definition top-level params, drilldown pagination, and report version fields
* Fix ID cluster update/delete routing to `te_analysis_extend` MCP service
* Document `SqlDatatableDef` qp shape and examples for `metadata data-table sql-write`

### 6.0.28
**Date:** 2026-07-10

**Changes:**

* Add 47 analysis data-management capability commands (event, property, virtual-event, virtual-property, metric, asset, exchange, datatable, super-metadata)
* Align super-metadata export with async XLSX artifact workflow (`request-id`, `timeout-seconds`, run inspect + artifact download)
* Add BI panel version get/publish commands; clarify released vs draft panel contracts, daily-report send flags, and dashboard report filter usage
* Improve tracking-plan and tracking-code skills (snippet delivery and plan workflow docs)

### 6.0.27
**Date:** 2026-07-09

**Changes:**

* Expand te-agent with sandbox/agent CRUD for agents, MCPs, skills, and models
* Add analysis artifact download and run inspect commands; refine dashboard export contracts
* Migrate DataOps API calls to cli-token and support taskInstanceId in task instance detail
* Improve CLI token handling with daily renew, clearer 403 errors, and host URL normalization
* Adapt engage save_flow protocol and support tracking-plan file upload in sandbox workspace

### 6.0.24
**Date:** 2026-07-08

**Changes:**

* Fix auth bugs
* Add 40+ commands across dashboard and project space domains

### 6.0.22
**Date:** 2026-07-07

**Changes:**

* Refactor auth
* Update tracking CLI commands
* Add new metadata domain commands

### 6.0.20
**Date:** 2026-07-02

**Changes:**

* Enhance stability

### 6.0.18
**Date:** 2026-06-27

**Changes:**

* Enhance stability

### 6.0.16
**Date:** 2026-06-25

**Changes:**

* Supports tracking command

### 1.0.30
**Date:** 2026-06-23

**Changes:**

* Enhance stability

### 1.0.29
**Date:** 2026-06-23

**Changes:**

* Enhance stability

### 1.0.28
**Date:** 2026-06-22

**Changes:**

* Enhance the security of use

### 1.0.27
**Date:** 2026-06-18

**Changes:**

* Support customer workspace

### 1.0.24
**Date:** 2026-06-05

**Changes:**

* Add knowledge base (KB) commands

### 1.0.20
**Date:** 2026-05-27

**Changes:**

* Add analysis guided QP builder command and dry-run regression verification

### 1.0.19
**Date:** 2026-05-21

**Changes:**

* Improve skills

### 1.0.17
**Date:** 2026-05-07

**Changes:**

* Improve login flow

### 1.0.16
**Date:** 2026-04-30

**Changes:**

* Initial release of the ae-cli terminal tool
