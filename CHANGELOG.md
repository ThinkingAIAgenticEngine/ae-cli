### 6.0.46
**Date:** 2026-08-27

**Changes:**

#### Data Integration
* Expand `data-integration handoff` into a reusable delivery package with frozen mappings, pipeline descriptors, shape checks, executable transform/upload stages, runbooks, and a shareable zip for processing future files with the same structure
* Harden local-data transformation with explicit AE system-field contracts, structured failure classification, quarantined-row salvage guidance, quote/UUID/IP handling, and working `flatten_rules` support for XLS and XLSX inputs

#### Analysis & Governance
* Add `analysis-governance asset-authentication` list, export, and update commands with server-side filtering, complete private JSONL exports, typed asset identities, snapshot conflict protection, and structured batch results
* Add the `personal-semantic-preference` domain for listing, reading, creating, updating, and deleting the authenticated user's project-scoped semantic preferences
* Expose normalized effective dashboard settings and saved default, business, space, and fixed-time filter configurations through dashboard get/update workflows
* Define deterministic analysis cache and metadata-discovery behavior: bypass cache only for explicit freshness needs, retry UI mismatches once without cache, cap online metadata misses, and reuse one complete local catalog snapshot

#### Knowledge Base & Engage
* Let `kb +url` rely on server-side Lark/Feishu URL detection and parsing, without requiring a client `--platform` flag; clarify that custom parse instructions are ignored for Lark/Feishu document URLs
* Harden Engage A/B task construction by keeping experiment group tuples aligned across experiment and channel content lists, requiring main-goal touch-cycle fields, and verifying persisted groups after save

#### Agent & CLI
* Harden Skill editing and version synchronization with actionable version-conflict recovery, customer-safe history-conflict errors, internal-only rescan guidance, and explicit public npm registry selection during version installation
* Preserve Host configuration on `auth logout`, and stop capability discovery from guessing unregistered domains or retrying empty catalogs without deployment or permission evidence

### 6.0.45
**Date:** 2026-08-21

**Changes:**

#### Knowledge Base
* Rework KB discovery around deterministic `+index` → `+grep` → `+read` navigation: add `+read --outline` and the `ae-kb-discovery` Skill, require explicit `--sources` / `--paths` scoping for `+grep`, validate `+list --build-status`, and retire `+query`
* Change `kb +ask` to submit-and-poll execution while preserving synchronous-by-default output; add `--no-wait` and `kb +ask-status` for long-running questions, and refine source, section-range, and page-window guidance

#### Data Integration
* Remove the 200 MB hard limit for non-XLS local files and raise the legacy XLS limit to 1 GB; add dry-run size/time estimates and non-blocking processing-time or memory-risk warnings before large-file inspection

### 6.0.44
**Date:** 2026-08-20

**Changes:**

#### Data Integration
* Add an end-to-end local-data workflow for inspecting, profiling, transforming, mapping, reusing, and uploading CSV, TSV, TXT, NDJSON, and Excel files, with encoding detection, nested-data flattening, type and time inference, conflict resolution, and tracking-plan handoff support

#### Analysis
* Add dashboard business-filter updates and project-space business-filter upserts, and include dashboard folders and sticky notes as analysis context
* Support property filters for metric-value and first/last-occurrence tags, and streamline Analysis Agent guidance to reduce redundant reads and ineffective executions

#### Agent & Security
* Enforce CLI access permissions, validate and automatically renew CLI tokens, and unify Agent command authentication and Host routing
* Add generic approval type, request, task, and Effect management commands, with stricter retry, isolation, and risk-control contracts
* Distinguish Agent sandbox requests from external CLI calls, improve KB authentication errors, and harden Agent command registry validation

#### DataOps
* Stream SQL query download results directly to local files for safer handling of large result sets

### 6.0.42
**Date:** 2026-08-13

**Changes:**

#### Engage
* Add inline query and asynchronous export commands for users behind task indicators, with identity-field validation, SQL compilation, artifact lifecycle support, and safeguards for deduplicated metrics
* Add asynchronous user-detail export for non-triggered tasks, including CSV/JSONL artifacts and the shared inspect, wait, download, and cancellation workflow

#### Analysis
* Add multi-keyword search to report, dashboard, BI panel, alert, SQL table, public-link, and project-space lists and report catalog exports
* Allow existing user tags and clusters to update their enabled auto-refresh Quartz cron without enabling auto refresh or triggering recomputation
* Tighten favorite, metric creation, virtual-property SQL update, and dimension-table binding contracts; clarify metric display names in analysis model guidance

### 6.0.41
**Date:** 2026-08-06

**Changes:**

#### Analysis
* Add unified metadata catalog list/resolution and split full-export commands for events, properties, metrics, tags, and clusters, with hardened cache/sync and async-export contracts
* Remove the Analysis MCP compatibility domain and the unauthenticated bare `api` command
* Align BI, member, event-detail, and entity-detail export contracts (jsonl/csv dual format, async full export); remove the generic sync-query `limit` parameter
* Unify analysis query preview and async-wait contracts; document path layer truncation, 120s default timeouts, virtual-node counting, continue-query evidence, and dashboard payload truncation
* Tighten AI analysis aggregation whitelist and Agent capability input / SQL guidance; align report resolutions, sub-property catalog, and Skill reference file coverage

#### Engage
* Add Engage query and export workflows for flow metrics/users/nodes, artifact download, and `request_id` query cancellation; align flow user-query contracts and camelCase field compatibility
* Add flow metric update; retire the task dedup user-detail export CLI
* Require `periodTimeSymbol` on event-triggered task A rules; clarify push-record query fields, task approval submit validation, config-item `show_time_zone`, and experiment-task `groupContentList` group binding

#### DataOps
* Add task-instance check nodes with CLI create and update support
* Support dry-run preview and confirmation when deleting workflow task nodes
* Task instance detail no longer returns disabled timeout configuration fields

#### Agent & Skills
* Remove preset MCP fallback from product Skills and add a release-gate check
* Complete additional `ae-cli system` coverage for usage CSV stream export, sandbox-tool lifecycle, models, and member statistics that landed after 6.0.40

### 6.0.40
**Date:** 2026-07-31

**Changes:**

#### Agent & System Administration
* Expand `ae-cli system` from 39 to 59 commands, covering member statistics, sandbox configuration, model sync policy and pricing, usage tool-call/drill-down/export workflows, account balance and over-limit users, and the full shared sandbox-tool lifecycle
* Add cache refresh to the usage summary and stream CSV exports to exclusively created local files with structured metadata and partial-file cleanup
* Document the server-side authorization and tenant boundary, excluded system-to-system endpoints, and the fact that Skill rules, dry-run, absent commands, and `--yes` are not security controls

#### Engage
* Add closed semantic-definition validation across flow, task, strategy, preset-event, activity, and common-metric writes, including strict field, operator, aggregation, and embedded DTO checks
* Clarify per-event and behavior-sequence `time_range` requirements and filter-property contracts, including technical-name or structured field references, `array_row` object-group filters, and rejection of unsupported or unknown fields
* Add `engage-activity.activity-data.detail` guidance for delivery-trend queries, covering activity/topic/task selection, time grains, cancellation request IDs, and indicator semantics

### 6.0.39
**Date:** 2026-07-30

**Changes:**

#### Agent & CLI
* Add the `memory` domain for user-memory lifecycle management, extraction and review, organization, default/context injection, and actual-use accounting
* Add Agent archived-conversation search and restore commands, and fix archived-time timezone display
* Add version-aware Skill add/edit/upload/synchronization workflows with stronger release validation
* Redesign Host/environment configuration with an interactive flow and trial guidance when no Host is configured

#### Analysis
* Expand project and system administration capabilities for project lifecycle, members and roles, MFA/authentication, mail and receiver configuration, monitoring and query tasks, and usage reporting

#### DataOps
* Add `+create_workflow_instance_check_task` and `+update_workflow_instance_check_task`, supporting multi-workflow checks combined by one-level AND/OR and DAY/HOUR/MINUTE check units; creation defaults to three checks at five-minute intervals
* Standardize dependencies and failure retries across SQL, integration, and workflow-instance-check tasks: use the `preTasks` array for multiple upstream tasks, preserve omitted update fields, clear dependencies with an empty array, and default creation retries to three attempts at five-minute intervals (`MINUTE`)

#### Engage
* Add activity topic/task payload validation and restore approval-submission workflows
* Remove obsolete `engage-setting query cluster-qp-skill`; build semantic audience, trigger, and completion definitions from Analysis models for Hermes compilation, including `targetDefinitionRequest` compilation before legacy Flow validation
* Clarify Webhook versus client channel parameters and document optional `relationProps` on task save

### 6.0.38
**Date:** 2026-07-30

**Changes:**

#### Tracking
* Add local Debug device management and received-data inspection commands, and update tracking-code guidance with an end-to-end CLI verification workflow
* Add tracking-plan display-name synchronization so event and property names can be updated from the generated tracking plan

#### CLI / Agent
* Switch Skills release synchronization to the centralized system service, with updated packaging scripts and regression coverage

### 6.0.37
**Date:** 2026-07-28

**Changes:**

#### CLI / Agent
* Add automatic host-bound CLI and Skills synchronization for public releases, including exact-version upgrade/downgrade, install locking and rate limits, local npm Skills first, GitHub fallback, and partial-failure recovery
* Extend `ae-cli update` with host/target selection, dry-run plans, and structured `AE_CLI_VERSION_SYNCED` retry semantics
* Add `--reuse-conversation` to Agent automation create/update so scheduled runs can continue in one visible conversation, with compatibility fallback coverage

#### Tracking & documentation
* Fix tracking-code generation Wiki references to use `~/.ae-cli/wiki/raw` and `~/.ae-cli/wiki/synthesis`
* Refresh bilingual internal/public README documentation and add a Chinese changelog

### 6.0.36
**Date:** 2026-07-24

**Changes:**

#### CLI / Agent
* Add host-bound `ae-cli update` to install the CLI and Skills version required by the current AE host
* Add `system` domain for Agent system administration (members, sandboxes, models, usage, cost controls, quotas, IM channels)
* Support npm sandbox tool install/upload under the system domain

#### Analysis
* Migrate `batch_create_metadata` / `batch_edit_metadata` to the new CLI capability entry points
* Simplify dashboard daily-report get/send/update/send-status commands
* Align dashboard empty-shell create/rename and BI panel create/update contracts; clarify BI empty-shell and summary drilldown docs
* Remove `alert-definition-schema get`; adapt alert create/update params for definition builder

#### Engage
* Add `engage-scene strategy predict` for audience size estimation and expand strategy audience docs
* Add `engage-setting query cluster-qp-skill` (require `--project-id`); update save-flow / task-save workflows
* Allow `engage-task task save` to update paused tasks
* Expand activity-topic audience and task orchestration guidelines

### 6.0.35
**Date:** 2026-07-23

**Changes:**

#### Analysis
* Migrate analysis query helpers to capability gateway (`query-cluster list`, `filter-value list`, query cancel path) and retire superseded legacy analysis / meta / common entry points
* Require `--project-id` on drilldown and create-result-cluster flows; document SQL `PartDate` timezone and AI QP compile-failure contracts
* Clarify tag latest-version semantics for `filter-value list` (data-snapshot behavior)

#### Agent
* Add `agent +list-sandbox-tools` to list sandbox tool inventory; ignore oversized unmanaged sandbox tool files
* Harden async command / program lifecycle contracts

#### DataOps
* Complete MySQL Source create contract and MySQL Sink config guidance
* Ignore `syncName` on integration solution update and tighten update contracts

#### Tracking & metadata
* Fix tracking-plan autotrack vs client SDK mismatch for existing auto-collected events; fix public event-property i18n in tracking-related skills
* Remove retired metadata event/property get legacy entry points (gateway-only)

### 6.0.34
**Date:** 2026-07-22

**Changes:**

#### Engage
* Continue capability-gateway migration: move config-channel list/get/status/delete to `engage-scene`, and remove leftover legacy MCP setting/task/flow entry points
* Add `engage-flow flow update-remark` for flow version remarks
* Re-enable activity topic/task create+update; re-enable common-metric create (tighten QP / time-unit contracts) and client-param create (`column_type` only)
* Require `--project-id` on flow node-config schema/validate; align channel `update-status` with backend enums (`1`=on, `2`=off)
* Translate `ae-engage` skill docs to English

#### Knowledge base
* Align `kb +query` with grep-style optional flags: `sources` optional; add `--top-k` and `--locale`

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
* Add `engage-scene config-item list`; re-enable engage-task commands; regroup ops tasks under `task`
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
* Retire gateway-superseded legacy analysis command entry points

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
