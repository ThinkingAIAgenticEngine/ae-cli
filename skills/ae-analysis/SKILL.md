---
name: ae-analysis
version: 4.2.26
description: "Use ae-cli for AE analysis-side data questions, asset operations, and asset governance: reports, analysis boards, BI dashboards, ad-hoc models, drilldown, detail data, alerts, clusters, tags, metrics, metadata discovery, project configuration, tracking plans, local input-file upload, governance asset lists/rules/lineage/impact/dependency, batch asset operations, projects, and resource links. Use when the user asks to query data, explain a change, export evidence, inspect/create/update/govern analysis assets, recommend project assets for certification/authentication, review asset-certification recommendations, review metric recommendations, or build/update/refresh/sync a project semantic knowledge base from a governed asset package."
---

# ae-analysis

This is the single entry skill for analysis intent and command execution.

## Capability contract

- Responsibilities: analysis queries and assets, metadata discovery, audience definitions, local input-file upload, and the governance/project/tracking workflows described below.
- Inputs: verified project context and the requested measures, time windows, filters or operation-specific resources; upload also needs a local file and a discovered purpose.
- Outputs: query evidence with its scope, verified metadata, operation/resource identifiers, uploaded input-file identifiers, or asynchronous run/artifact status as applicable. Query rows are not automatically a persisted audience.
- Boundaries: engagement operations and metadata data-table writes/dimension binding are outside this skill's workflows; find the capability needed for any remaining work.
- Completion: the requested analysis-side result is verified, or pending/blocked work is identified. Keep any other parts of the user's request unfinished until addressed.

## Cross-skill collaboration

When remaining work is outside this skill's scope, or a necessary prerequisite needs another capability, follow [the collaboration protocol](references/collaboration.md). Choose from the skills available in this run by capability, preserve verified context, and continue the remaining task. Reuse this protocol if already loaded.

## Agent Context Telemetry

Hard rule: before running gateway-backed `ae-cli` commands in this skill, maintain the current Agent context in `.ae/cli-agent-context.json` at the working directory root, unless the user explicitly asks not to send intent telemetry. Keep the business command clean; do not append `--agent-context <base64url-json>` by default. Runtime auto-detection alone is only a partial fallback and is not enough for user-intent telemetry.

The context file must use `intent_source: "agent_context_file"` and should include a concise task-level `user_intent`, the current `session_goal`, stable `agent_session_id`, current `agent_turn_id` when available, `intent_relation`, and `intent_revision`. Use the user's original language for `session_initial_intent`, `user_intent`, and `session_goal`; for example, use Chinese text for a Chinese user request. If model or parent-turn fields are unknown, omit only those fields; do not omit the whole context payload. Prefer concise intent summaries over long raw transcripts. Update the file when starting a CLI-backed task or when the user's CLI purpose changes; do not rewrite it before every command for the same purpose.

## Analysis workflow

For data queries:

1. Take the current project and requested metrics, windows, groups and filters. Before choosing a knowledge-base or analysis route, apply the [Project Semantic Knowledge and Discovery](#project-semantic-knowledge-and-discovery) gate. Reuse known assets and definitions; discover unknown business measures with [metadata resolution](references/metadata_resolution.md), then select the needed saved-report or ad-hoc command/model references.
2. Confirm any new business mapping once, fill the required parameters, and execute the applicable saved report or complete ad-hoc definition. Reuse confirmed meanings in dependent queries. If the confirmation tool cannot obtain a reply, present the same choices in text and wait for the reply.
3. Correct compiler errors at their reported paths. New evidence or a user correction changes a completed choice; preserve the other verified inputs.
4. Use the returned result directly. Save original JSON only when the user requests a file or necessary local processing requires one; follow [result handling](references/analysis_data_retrieval.md#preserve-and-interpret-results). Keep stderr and the CLI exit status visible.
5. Compute only missing values needed by the request, together in one local call. Reuse completed results and answer when the requested data is available, or explain the specific error or missing input.

## Route before reading

1. Map the request to a command family before opening any reference.
   - CLI Agent asset-authentication and metric-recommendation review: this includes requests to recommend project assets for certification/authentication, review asset-certification candidates, review project asset-governance recommendations, review recommended metrics, or explicitly auto-review/auto-certify recommended assets. Open `references/governance_recommendation_export.md` and route to `analysis-meta governance-recommendation export|submit|auto-review|decisions`. For review-page submission, open `references/agent_review_submit_to_page.md` and use `analysis-meta agent-review submit-to-page|list|detail|records|review|retry`. Do not load project semantics, project KB, or personal semantic preferences as a preflight.
   - Project semantic knowledge-base build/update/refresh/sync: open `references/project_semantic_knowledge_wiki.md` and route to `project-semantic asset-package export`, local semantic planning, and local Wiki rendering. Default to CLI semantic precompilation into Markdown sources, source ZIP upload, and KB schema/compile. Update changed source files and run incremental KB compilation on refresh. Never substitute read-only snapshot import. Stop on company permission denial. This is a command-reference workflow inside `ae-analysis`, not a standalone project semantic Skill.
   - Known family: open only its dedicated reference. For example, a retention request goes directly to `references/adhoc_run.md`, the common `references/ai_models.md`, and `references/ai_models/retention.md`.
   - Unknown family: search [`references/command_index.md`](references/command_index.md) with `rg` or an equivalent text-search tool and keep only the matching rows. `command_index.md` is a search-only fallback; never open it with a whole-file read or print the entire file.
2. Read the selected command's dedicated reference before composing it:
   - `event list` -> `references/event_list.md`
   - Readable saved report/dashboard discovery -> `analysis asset search` and `references/asset_search.md`; this includes shared read-only assets.
   - `analysis dashboard list` -> `references/dashboard_list.md`
   - `personal-semantic-preference list` -> `references/personal_semantic_preference_list.md`
   - Asset center cross-source configuration (资产中心 / 跨源资产配置 / Excel 配置表导入): L3 discovery via `capability search "cross_source_config" --domain metadata --project-id <id>`; read [`references/cross_source_config.md`](references/cross_source_config.md) for workbook upload and validation. No dedicated business commands.
   - replace hyphens with underscores in gateway filenames.
3. For an AI-facing definition, read the short common [`references/ai_models.md`](references/ai_models.md) and `references/ai_models/<model_type>.md` for each selected model. Batch these reads; direct model paths replace heading searches and line-number calculations.
4. For cluster/tag `--definition-request`, also read the matching [`references/user_cluster_models.md`](references/user_cluster_models.md) or [`references/user_tag_models.md`](references/user_tag_models.md). Shared primitives live in [`references/audience_models.md`](references/audience_models.md).
   - For tag periodic refresh, read `references/user_tag_create.md` or `references/user_tag_update.md`; they cover the enable switch, frequency/time schedule, cron alternative, and timezone behavior.
5. For query data, read the short [`references/analysis_data_retrieval.md`](references/analysis_data_retrieval.md) together with the selected command and model files. It links to export and follow-up details only when those operations are needed.
6. For unknown AI-facing metadata, or when a compile failure contains `slot_kind`, `allowed_resource_types`, `search_targets`, and `next_action`, read and follow [`references/metadata_resolution.md`](references/metadata_resolution.md).
7. For an unfamiliar aggregation, cohort or attribution rule, consult the matching section of [`references/analysis_interpretation.md`](references/analysis_interpretation.md).

Routing is complete when one command family and its dedicated references are selected. The generated command index is exhaustive and must stay out of model context except for matching search rows. This file contains routing and workflow rules only; do not duplicate a hand-maintained command inventory here.

Use `analysis report list` and `analysis dashboard list` only for manageable-asset directories before edit or management workflows. They exclude read-only shared assets. For viewing, finding, or selecting a saved report or dashboard, prefer `analysis asset search` so readable assets remain discoverable.

Saved-report writes follow the analysis page's product boundary: `analysis report create/update` accepts at most one compound filter level, and every entry in that group's `items` must be a leaf filter. Do not flatten a deeper tree returned by `analysis report get`; use a metadata-only update or obtain an explicit page-compatible replacement definition. Ad-hoc analysis keeps its model-specific recursive filter support.

## Boundaries and priority

Use this skill for these CLI services:

- `analysis`: reports, dashboards, BI panels, ad-hoc analysis, drilldown, detail data, alerts, clusters, tags, and async runs/artifacts.
- `analysis-meta`: gateway metadata assets, events, properties, virtual metadata, metrics, data tables, exchange rules, and super metadata. Cross-source asset configuration uses the metadata L3 catalog instead.
- `analysis-governance`: gateway asset governance operations, including governed asset lists/exports, lineage, dependency, impact, query history, rule schema/list/create/update/delete, batch asset actions, and operation records. Use this service for asset governance workflows, not for metadata event/property/metric CRUD.
- `tracking`: gateway tracking plan, checking, ingest, live-data, and event blacklist operations.
- `personal-semantic-preference`: current user's project-scoped personal semantic preferences. Use it as agent context before resolving ambiguous business wording, asset choices, or recurring user preferences.
- `project-semantic`: asset-package export for an explicit project knowledge-base build or refresh. The old governed project-semantic lifecycle is no longer available through CLI.

For work outside the command families covered here, use the collaboration protocol to discover a matching available capability rather than assume a particular Skill name.

Use `ae-cli` as the only execution path for this skill. If a command is missing, unsupported, not implemented, or a capability gap is confirmed, report that gap; do not switch to direct MCP execution. A validation error or `need_clarification` calls for its specific input correction. A transport failure such as `fetch failed` means the result is unavailable: report the error with any already obtained results and stop the dependent request. Resume after environment recovery; do not start route probes, sleeps or background network polling. A transport failure does not establish a missing capability or empty data.

For tags and audience clusters, use the native `analysis user-tag ...` and `analysis user-cluster ...` gateway commands.

For CLI Agent asset-authentication and metric-recommendation review, route to `analysis-meta governance-recommendation export|submit|auto-review|decisions`. Common returns the deterministic evidence packet; the Agent owns the fixed human approval display from `references/governance_recommendation_export.md`, including business-domain grouping, plain-text status labels, and risk/conflict explanation. Call `auto-review` only when the user explicitly asks for automatic review or automatic certification; a plain recommendation request and a recommendation-plus-page-submission request must not check the automatic certification project config or auto-certify assets. When `auto-review` is called without an explicit `--limit`, the CLI validates the auto-certification and project-semantic switches, read-only probes top-20/top-50/top-100 pending recommendation material as needed, then the CLI Agent builds one set of automatic certification decisions from the final material and submits those decisions for execution/audit. The CLI Agent, not Common historical recommendation state, owns semantic-duplicate detection; duplicate skips must name concrete conflicting asset targets. The auto-review result also returns `manual_review_handoff` for assets still uncertified after automatic review; if the user later asks to submit those leftovers to the page, build `agent-review submit-to-page` from `manual_review_handoff.page_review_items` so dashboard/report parent context is preserved, treat only `manual_review_handoff.items` as the human certification workload, and include each automatic non-certification reason in the item summary. Do not use project-semantic, project-KB, or personal-semantic-preference commands as prerequisite context for this workflow. Do not use management commands such as `asset-authentication list|export|update` or metric CRUD commands to synthesize recommendations. Do not bypass curated commands with `ae-cli capability inspect|validate|dry-run|run` for `governance.asset_authentication.dashboard_package`, `metadata.metric.recommended_scan`, or `metadata.metric.recommended_create`.

After presenting recommendations, the Agent may ask whether to submit them to the review page. A user choice to submit authorizes `analysis-meta agent-review submit-to-page` only; it does not authorize approval, certification, config checking, or `governance-recommendation auto-review`. If the user declines, do not write or repeatedly suggest submission. Existing explicit submission authorization remains valid and does not need another prompt. A preauthorized unattended task may submit review proposals only; it must never call `agent-review review|retry`, legacy `governance-recommendation submit`, `governance-recommendation auto-review`, or direct certification/metric mutations automatically. Use `agent-review list|detail|records` and the task's persisted proposal fingerprint to reuse prior batches. Do not resubmit or send repeated notifications for unchanged proposals, pending reviews, completed items, or previously declined suggestions. A new run ID alone is not new evidence. Report the returned `review_url` once and remain quiet until there is a meaningful change or required user action. See `references/agent_review_submit_to_page.md` for stable request keys and packet rules.

Report review details must explain calculation logic and statistical measures, not only business purpose. Follow resolve/export -> material-package completeness check -> gap-only `analysis-meta agent-review evidence` or `analysis report get` -> chunked AI explanation -> independent preflight -> authorized submit-to-page -> detail readback. LOCAL_ONLY stops at the local preflight result. `governance-recommendation export` is expected to include report `evidence_snapshot.analysis` and `target_revision` in `review_material_package.candidate_assets`; do not ask the customer to run `analysis report get` for every report when those fields are present. Fetch `agent-review evidence` only when a report item lacks current analysis, when validating a generated draft, or when the material package explicitly marks a definition gap. Read `references/agent_review_evidence.md` for stable analysis fields and their limits. Populate `item.ai_summary.analysis_explanation` with evidence-backed measures, dimensions, calculations, filters, time_scope, and query_columns as applicable; interpret each supported SQL projection column separately. Reference only actual fact-supporting response paths rooted at `evidence_snapshot.analysis`; `source_path` is provenance, not an automatic evidence_refs substitution. Preserve server facts separately from AI interpretation and explicitly identify null, missing, dynamic or unparsed evidence. For DYNAMIC SQL, label supported sql.raw/normalized_definition.params discussion as original-text interpretation, never fabricate select_columns or runtime substitutions. Common create stores the submitted packet; it does not fill missing calculation explanations for the Agent. Before calling `submit-to-page`, check required `evidence_snapshot.analysis` and resolvable references in `analysis_explanation.calculations` / `analysis_explanation.measures`; missing required structure remains an error. Reviewer-readability and interpretation defects follow the bounded quality correction/warning procedure. Verify the stored snapshot and references in detail after submission. Never guess SQL, aliases, columns, formulas, time ranges, timezones, or successful execution. Definition inspection, evidence reads, validation, and submission are not proof of query results, approval, or certification.

`item.ai_summary.summary` is the concise item recommendation reason, including its evidence basis and main risks, displayed in the main list. `batch.ai_summary.summary` is the batch overview and cannot replace item reasons. Detailed factual explanations belong only in `item.ai_summary.analysis_explanation`. Do not duplicate reasons or detailed analysis into presentation fields; keep `presentation_snapshot.analysisByItem` as `{}`. Do not invent a reason from unknown values; state missing evidence or uncertain risks explicitly rather than treating them as zero or absent.

Scripts may build the transport file, preserve IDs, copy evidence, normalize links, and run deterministic completeness checks. Scripts must not author page-visible `ai_summary.summary`, `analysis_explanation.*.statement`, limitations, open questions, or approval rationale by filling reusable sentence templates. Those fields must be Agent-written interpretation from the current asset/report evidence; if many submitted items share the same narrative shape after only asset names or numbers change, flag a quality failure and follow the bounded correction/warning procedure in `references/agent_review_preflight.md`.

Page-visible review text is for human asset reviewers, not implementers. In `item.ai_summary.summary`, visible statements, and open questions, write plain business Chinese: what the asset is for, how it is calculated, which filters/date windows matter, and what the reviewer should confirm. Use event and property names from the current asset definition when they help the reviewer verify the calculation definition. Do not expose internal evidence, parser terms, temporary SQL aliases, or runtime parameter names such as `SAVED_REPORT_ONLY`, `DYNAMIC`, `REPORT`, `T1`, `a0`, `a1`, `Variable2`, `selector3`, `PartDate date1`, `source_path`, `evidence_snapshot`, raw JSON, raw SQL, hash/revision details, dashboard override warnings, timezone-not-saved notes, or claims about query execution unless the user explicitly asks for debug evidence. Convert internal values before display, for example `T1`/`day` becomes `按天`, and dynamic SQL caveats become business confirmation items such as “确认参数含义、默认日期范围和是否包含测试数据”.

For real review-page submission, start with `analysis-meta governance-recommendation export --limit 20`. This is the initial candidate pool, not a required submission count. Follow the rejection filtering and bounded expansion procedure in `references/governance_recommendation_export.md`: hide each same-definition rejected dashboard's entire display branch, retain shared assets only under other retained dashboards, filter out already completed/authenticated, deferred, or in-flight assets as pending work, and expand an insufficient pool from 20 to 50 to 100, then stop. Expansion is for business-domain coverage, not unlimited workload: for recurring daily batches, target about 20-50 pending review assets, hard cap around 80, and balance roughly 3-6 visible domains with per-domain quotas before adding context. Use the latest successful export as the drafting evidence and report the actual reviewed scope plus overflow left for later batches. Do not compress eligible coverage into a few representative themes or submit only the first work unit unless the user requests a sample or diagnostic batch. Business themes organize the retained dashboard set; they do not replace its coverage. For recurring recommendation jobs, submit only business domains that still contain pending review assets; authenticated assets are supporting context under those visible domains, not standalone work. Do not write long Agent summaries for hidden domains or pure authenticated context.

For dashboard recommendations, preserve optional location facts from Common: when a dashboard candidate or source dashboard includes `space_id` or `space_name`, copy those fields into the submitted dashboard item's `evidence_snapshot.definition.config` so the review page can show `所属空间`. Not every dashboard belongs to a space; missing space fields are valid and must not be invented, required, or used to filter out an otherwise eligible dashboard.

`presentation_snapshot.topics` must be business domains, not dashboard containers; business domains are not dashboards. Never create one topic per hot dashboard merely because the export returned 20 work units. First cluster the selected dashboards by business process using dashboard names, child report names, report definitions, referenced events/properties, metrics, folder context, and authored notes. If several dashboards describe the same business area, put them in one topic and keep each dashboard as a root item under that topic. Split topics only when the business process or review decision is materially different. The expected hierarchy is 业务域 -> 看板 -> 报表 -> 元数据; the number of topics can be smaller than the number of selected dashboards, and a `topic_count == selected_dashboard_count` result must be justified by genuinely distinct business meanings, not by source array order.

For page review, preserve the prototype hierarchy in `presentation_snapshot.relations`: source dashboard items are parents of their child report items with `type:"contains"`, and report items are parents of metadata items they actually reference with `type:"uses"`, such as events, event properties, user properties, and metric assets. Topic `items` may list the same stable `client_item_id`s, but the page must be able to render 看板 -> 报表 -> 元数据 from `relations`. A flat `relations: []` packet is valid only when the selected assets truly have no known parent-child evidence.

The full `evidence_hash` includes collection time and may change between previews without business changes; use `target_revision` for saved-definition version checks and compare material facts separately. Do not use full snapshot hashes to trigger cross-scan resubmission. Create stores the submitted snapshot without restoring omitted fields; verify references and important facts in detail against the final dispatched material.

If a retired split recommendation command or capability is accidentally probed and returns an error, treat that as a routing correction only. Do not use data from split recommendation commands or capabilities as the business source for a recommendation answer; rerun the current workflow through `analysis-meta governance-recommendation export`.

For review-page drafting, material inspection, or local-only rehearsals, read `references/agent_review_preflight.md` and `references/agent_review_priorities_comparisons.md`. After item explanations, generate evidence-backed review priorities and compare related definitions across authoring chunks/topics; store `recommendation`, classified `comparisons` and `comparison_review` in item AI summaries. Review priority is not a certification decision, and similarity alone is not conflict. Use an independent fresh-context reviewer to compare all evidence (including `signals`) with saved sources and review item-specific meaning, priorities and paired definitions. The author corrects concrete findings at most 3 times for the whole packet, with independent re-review. If quality still fails, an already authorized submission continues with explicit unresolved-quality warnings; never claim PASS or reset the correction budget. Disclose unavailable review or incomplete coverage. Local-only intent always forbids submission. Quality assessment belongs to the Agent, not Common; structural validation, authorization and transport errors remain enforced.

## Global AE CLI Rules

Command forms:

```bash
ae-cli analysis <resource> <action> [options]
ae-cli analysis-meta <resource> <action> [options]
ae-cli analysis-governance <resource> <action> [options]
ae-cli tracking <resource> <action> [options]
ae-cli capability search|inspect|validate|dry-run|run [options]
```

- Gateway commands use kebab-case flags such as `--project-id`; the CLI sends snake_case JSON.
- Gateway commands must be preceded by the `.ae/cli-agent-context.json` update described in the Agent Context Telemetry section. The hidden `--agent-context <base64url-json>` option is only a fallback for isolated no-write environments or local debugging, not the preferred path for this skill.
- JSON values must be JSON string literals.
- Global flags include `--host`, `--format json|table`, `--jq`, `--validate`, `--dry-run`, and `--yes`. Use `--validate` only to resolve a concrete complex-input issue; use `--dry-run` for high-risk writes or an explicitly requested preview. These modes are mutually exclusive.
- Execute a fully specified read or ordinary write directly. Do not routinely stack inspect, validate, dry-run, and run. Inspect the selected model contract once when a concrete schema mismatch requires it; reuse that inspected contract within the unchanged conversation scope. This is local evidence reuse, not a claim that the CLI caches contracts.
- JSON is the default machine-readable output. On failure, preserve the structured error and non-zero exit.
- `CREDENTIAL_STORE_UNREADABLE` (`error.type: config`) is a local credential read/decryption failure. Preserve the files and retry in the original OS user/runtime with machine-identifier access; do not automatically log in, replace tokens, or log out. It does not establish server-side token expiration.
- Never invent command names, flags, payload fields, projects, resource IDs, asset names, canonical event/property identifiers, metric formulas, or dates. User-provided business wording is valid unresolved compiler input; it is not a claim that a canonical binding is known.
- 中文时间表达必须按固定语义映射：最近7天/近7天 -> `mode=recent` -> QP `recentDay=0-7`，含今天；过去7天/前7天 -> `mode=previous` -> QP `recentDay=1-7`，不含今天。用户明确说明是否包含今天时，以该说明为准。完整映射见 [`references/ai_models.md`](references/ai_models.md)。

`CAPABILITY_NOT_FOUND` means the current host does not expose that gateway capability; changing parameters will not fix it. A permission error stops any dependent chain. A 404 while inspecting an async run is a route/deployment failure; do not poll the same ID forever.

Interpret gateway envelopes by state:

- `ok: true` with empty data is success and means no matching data. Never relabel an empty report/dashboard result as query failure.
- `ok: true` with `meta.partial: true` is partial success. Use the successful data and explicitly report `meta.failures`; do not fail the whole batch or hide failed items.
- `ok: false` is failure. Preserve `error.code`, `error.message`, and `meta.request_id`, `meta.invocation_id`, `meta.stage`, and `meta.failures` when present.
- `OUTPUT_PROJECTION_FAILED` is a local output failure after command completion: stdout retains the original business payload in `data` and original `meta`, while exit status remains non-zero. Repair the projection from that returned envelope without resubmitting the remote command.
- Do not retry an unchanged failed command or guess alternative payload shapes. Retry only after applying concrete validation/clarification guidance or correcting a verified transient condition.

Failure evidence:

- A process exit code of 0 is not business success when the envelope says `ok: false`. Prefer direct CLI invocation; if a shell pipeline is necessary, preserve the CLI exit status with `set -o pipefail` and retain the complete error envelope rather than truncating it.
- `TE_TOOL_POLICY_DENIED` identifies the runtime authorization stage. Report its exact reason; it does not prove a backend schema check passed or that the user needs to log in again. Do not bypass policy or retry by changing the business scope.
- `INVALID_ANALYSIS_DEFINITION` / `INVALID_CAPABILITY_INPUT` identifies an input failure. Correct all relevant fields together within the allowed retry budget. Say "validation passed" only after an explicit successful validation response for the same complete definition on the same host.
- `QUERY_FAILED` establishes that the query failed; it does not establish the database or engine root cause. Preserve the returned error and correlation IDs, leave unavailable values unknown (not zero), and stop when the user requests no retries. Distinguish observed errors from unverified hypotheses.

For every gateway command that exposes `--request-id`, ae-cli generates a `request_id` and prints it to stderr before dispatch when the caller omits it. Preserve that ID with the final envelope and diagnostics. Pass an explicit `--request-id cli_<32 lowercase hex>` only when a caller-owned correlation ID is required.

### Execution invariants

- Probe the first page exactly once. Verify `ok`, the documented data shape, and the effective `limit` before starting a pagination loop.
- For paginated directory results, continue only with the returned `next_offset` while `has_more` is true. Never calculate a speculative offset, repeat the current page, or declare the list complete before `has_more` is false.
- Track the normalized command, input, and announced `request_id` for every invocation. Never resubmit an identical invocation while it is still in flight; wait for the current process, or inspect its returned `run_id` when it is asynchronous.
- Reuse completed data, verified metadata, selected assets, and already downloaded files when host, identity, project, definition, effective scope, and completeness match. Query only an identified missing dependency; batch compatible metrics and do not add unrelated analysis to a lookup.
- Retry only the items named in `meta.failures`, and only when their `retryable` value and `next_action` permit it. Never retry successful or empty items from the same batch.

## Mandatory routing

### Product terminology gate

- The Chinese product term `看板` means an analysis board backed by saved reports. Route it to `ae-cli analysis dashboard ...` and capability IDs under `analysis.dashboard.*`.
- The Chinese product terms `仪表盘` and `BI 仪表盘` mean a BI dashboard with worksheets, charts, and pages. Route them to `ae-cli analysis bi-panel ...` and capability IDs under `analysis.bi_panel.*`.
- These assets are not aliases. Never substitute an analysis board for a BI dashboard, or a BI dashboard for an analysis board.
- The standalone English word `dashboard` is ambiguous in this product. Before a write, ask whether the user means an analysis board (`看板`) or a BI dashboard (`仪表盘`) unless the surrounding context already makes the product asset explicit.
- If the requested BI-panel capability is unavailable or unauthorized, report that constraint. Do not fall back to creating an analysis board.

### Project gate

Use the current turn's project ID supplied by the Agent host. When no project is supplied, resolve the user's ID or name with `project info list`. Ask only when the returned candidates leave a real ambiguity. A new user selection replaces the previous project for subsequent commands.

### Project Semantic Knowledge Base

When the user explicitly asks to build, update, refresh, rebuild, or sync a project semantic knowledge base, open `references/project_semantic_knowledge_wiki.md`. That command-reference workflow starts from `ae-cli project-semantic asset-package export` and then uploads/compiles KB sources. The retired governed project-semantic candidate and release lifecycle is not part of this knowledge-base build path or CLI Agent asset-authentication and metric-recommendation review.

### Project Semantic Knowledge and Discovery

Do not call project-semantic catalog, entry, candidate, release, or publish commands. The governed project-semantic lifecycle has been retired from CLI; use `personal-semantic-preference` for current-user semantics and the knowledge-base workflow for project knowledge.

For a project-scoped request that may need an asset or metric definition, decide the route before any analysis asset, report, or metric lookup. Follow an explicitly named knowledge base directly; skip this gate if the user rules out knowledge bases. Otherwise call `ae-cli config show` once per host and authenticated account in this conversation, and recheck when that scope changes or the answer is over 24 hours old. The command uses the CLI's daily company configuration cache; do not force a remote refresh for each question.

If `data.routing.knowledge_base` is `auto`, consider whether a project knowledge base could answer the question or provide the needed asset definition. If it could, use `ae-kb-discovery` first, prefer an exact project binding, and read matching pages through `ae-kb`. For data questions, use the verified saved asset from that evidence and then run the applicable analysis command. If no relevant knowledge-base page is found, continue with normal asset or metric discovery. If the routing value is `explicit` or `data.source` is `unavailable`, use the normal analysis route without implicit KB discovery. A KB candidate without a relevant page hit does not justify using its assets.

### Personal Semantic Preferences

When the request involves personal business wording, asset preferences, explicit personalization, or a project-scoped request to remember/save a reusable analysis workflow, call `ae-cli personal-semantic-preference list --project-id <project_id>` once per host, authenticated user, project, and conversation; reuse the result within that scope. Use the current project supplied by the Agent host. If an entry is adopted, read [`references/personal_semantic_preference_list.md`](references/personal_semantic_preference_list.md) and fetch that entry with `--title <title_from_list> --mark-used`. Read the same reference before recording a durable user preference; a one-time analysis confirmation is task context.
This rule does not apply to CLI Agent asset-authentication and metric-recommendation review through `analysis-meta governance-recommendation export|submit|auto-review|decisions`; that workflow must not load personal semantic preferences as prerequisite context.

Personal semantics supply the current user's defaults, interpretation corrections, asset choices, and output preferences. Verify any selected asset or calculation against its saved definition before execution; a personal preference does not replace the asset's current definition.

The Agent owns the personal preference capture trigger. Choose `context_type` by meaning:

- `preference`: durable interpretation or output preference without an exact asset binding.
- `asset_context`: durable user wording or intent bound to one or more exact project assets. Send the complete ordered `resource_refs` array; each item has `resource_type`, string `resource_key`, and `display_name`.
- `experience`: a confirmed reusable project work method or analysis workflow without an exact asset binding.
- `background`: stable personal context without an exact asset binding.

Any stable choice of a concrete asset, including an event-selection scenario, must use `asset_context`; do not encode asset IDs only in prose. During a project task, collect durable current-user preferences, stable interpretation corrections, reusable asset-selection choices, recurring output preferences, reusable project analysis workflows, and current-user working definitions that have not become approved project semantics. If the user says "remember the above workflow", "save this process for this project", "以后按这个流程", or equivalent while a project scope is active, record it here as `context_type=experience` instead of using `ae-cli memory`. A working definition remains eligible for personal storage even when it would also benefit other project users. Store it only as the current user's preference; never describe it as approved project authority or copy a bound asset definition into its content. Keep future governance or lifecycle instructions out of the stored content. Do not save transient task details, one-off analysis results, company knowledge, standalone metadata facts, reports, or dashboards as personal preferences.

An explicit stable statement, correction, or confirmation that passes that evidence gate authorizes `personal-semantic-preference add` or `update` without a second "save" confirmation. Compare against the already loaded catalog first; when one existing preference matches, fetch it with `--mark-used`, update that existing preference, and avoid creating a duplicate. Otherwise add a new one. An explicit instruction not to retain it always wins. Delete remains high risk and requires explicit user confirmation.

Personal capture and project recommendation are independent. Save or update the personal semantic first when its evidence gate is met. If the same content looks reusable as a formal project-wide definition, finish the current task and then ask whether the user wants to recommend it as a project semantic candidate. Do not make project recommendation a prerequisite for personal capture, do not submit a candidate without that user choice, and never approve or publish on behalf of an ordinary user.

After a successful add, update, or delete, merge that response into the conversation's cached directory locally. Do not call list again merely to observe the write.

When a later published project semantic matches a personal semantic, treat the project semantic as formal and allow the personal record to become redundant, expire, or merge through the supported lifecycle. When they conflict, keep the project semantic formal, disclose the conflict, and preserve the personal record unless the user explicitly changes or deletes it. These are consumption and lifecycle rules; do not append them to the stored personal semantic content.

Stale or expired preferences are automatically hidden by list filtering and backend maintenance. Do not look for or invent a separate command for that behavior.

### Metadata discovery

Reuse known definitions and canonical metadata directly. For an unknown business measure, follow [`references/metadata_resolution.md`](references/metadata_resolution.md): search relevant saved metrics/reports, read their definitions, and discover only missing events or properties. `allowed_resource_types` is authoritative for a compiler error. Confirm a selected business mapping once, even when there is only one suitable candidate; reuse the task's already confirmed mappings.

### Saved business asset or ad-hoc

If an exact asset or definition came from a knowledge-base page, first read and follow [`../ae-kb/references/analysis-workflow.md`](../ae-kb/references/analysis-workflow.md). Attempt the matched asset before using the ordinary fallback below. If it cannot produce a usable result, preserve that evidence, then follow the workflow's explicit fallback and disclosure rules.

Use a suitable saved report with supported requested overrides. For a custom combination, reuse the applicable definitions in an ad-hoc model. Read [`references/analysis_gateway_assets.md`](references/analysis_gateway_assets.md) for saved filters, dashboard context and asset selection. Load model references when constructing an ad-hoc definition.

### Preserve confirmed intent

Resolve the requested metrics, filters, groups, comparison windows, timezone, and cohort eligibility before the final query. Carry user corrections into the actual definition, including every dependent query; noticing an old date or metric mismatch in reasoning does not correct the submitted input. Carry the actual confirmation reply into these choices as described in the metadata workflow.

When the caller supplies an existing definition snapshot, use the selected command's optional `--intent-snapshot` contract to check local JSON consistency.

### Result data versus metadata

- Metric value, trend, comparison, or anomaly -> choose saved report/dashboard or ad-hoc using the decision above.
- Metric definition search/create/update -> metadata commands.
- Event/entity rows -> `event-detail run|export` or `entity-detail run|export`.
- Events/entities from a query result -> pass the original `--project-id`, follow the returned synchronous `query_context_id` and compact source action summary, then call `analysis query-context get` for full coordinate options; never reconstruct raw QP or use export rows as coordinates.
- Cluster/tag definition -> matching gateway cluster/tag commands and matching model reference.
- Tag/cluster candidate values, including requests phrased as "latest version" or "latest result" -> resolve the exact asset, then use `analysis filter-value list` with `cluster_date_policy=LATEST`. This means the latest computed data snapshot, never a definition or configuration release; do not invent version lists, version IDs, draft states, or publish states.
- Alert/configuration/tracking-plan requests -> the dedicated gateway command reference from the index.

### Run, export, and follow-up

Use `run` for a bounded inline result, and `export --output <file>` for complete or over-limit results. Read [export handling](references/analysis_data_export.md) when exporting or resuming an interrupted export. When the request needs a follow-up action advertised by the returned query context, read [`references/analysis_drilldown_contract.md`](references/analysis_drilldown_contract.md).

### Writes and destructive operations

Write only with explicit user intent. Correct a concrete complex-input issue with `--validate` when needed. Use `--dry-run` for high-risk writes or an explicitly requested preview; do not stack these modes. Execute `read` and ordinary `write` commands without `--yes`. For `high-risk-write`, dry-run first, summarize the target and impact, wait for explicit user confirmation, and only then execute the unchanged command with `--yes`.

Project-space and folder create/delete/share are L3 capabilities rather than curated `analysis` commands. Read the matching command reference, then use `ae-cli capability inspect|dry-run|run`; discover `*.members` through `capability search|inspect|run` and [`references/analysis_gateway_assets.md`](references/analysis_gateway_assets.md). For `risk=high-risk-write`, dry-run first, summarize the impact, and execute with `--yes` only after a later explicit confirmation.

After a successful create/update, if a resource ID and supported resource type are available, call `analysis-meta asset url-get` and return the link. Explicitly state when link generation is skipped because no resource ID exists or when it fails.

## Output requirements

- Return the requested result with its metric, window, dimension/filter scope and units.
- Reuse values already returned or calculated; compute an additional value only when the request needs it.
- For saved dashboard answers, use non-empty `location.folder_name`, `dashboard_name`, `remark`, and `notes[].note_title/description` to establish business scope. Label folder names and notes as authored context, separately from observed query evidence.
- State any returned partial-data, permission or capability limitation that affects the request.

For CLI Agent asset-authentication and metric-recommendation review, the final answer must use the fixed approval display from `references/governance_recommendation_export.md`:

- Top-level grouping is `业务主题域`; do not use separate top-level sections like `资产认证建议` and `推荐指标`.
- Keep the source dashboard as the core evidence package. Derive `业务主题域` from the dashboard semantics and its child report names, event/property/metric semantics, and shared business process. Do not use raw source titles, test labels, priority labels, asset-type tags, or backend `topic_seed` strings as the final group name when they are only workflow labels.
- `work_units` are evidence containers, not presentation groups. A single dashboard/work unit may split into multiple business domains when its child reports cover different business processes, and one business domain may merge evidence from multiple dashboards/work units when the business meaning matches.
- Keep each report-centered evidence chain together: the report row, metadata rows, and metric candidates introduced by that report follow the same `业务主题域`. Do not detach report metadata into a separate generic metadata group, and do not merge unrelated child-report domains only because they share one source dashboard.
- When one source dashboard contains child reports for different business questions, create one `业务主题域` per child-report business question. Do not combine distinct report domains into a broad `A 与 B 运营`, `综合运营`, or `核心语义` group only because they share the same dashboard. The dashboard can appear as shared linked source evidence in each relevant domain.
- Source dashboards and reports are evidence containers and possible asset rows, not independent top-level business domains. Do not create generic groups such as `看板上下文`, `综合验收看板上下文`, `推荐上下文`, or `待审批资产` only to place source dashboards. Attach each source dashboard to the business domains implied by its child reports, events, properties, metrics, and definitions; if one dashboard supports multiple domains, reuse it as linked source evidence in each relevant domain without using the dashboard title as the domain.
- Each `业务主题域` must contain asset-authentication rows and metric-candidate rows in the same review table.
- In the domain detail table, the `类型` column is the object class (`资产` or `指标`). Put review labels such as `[已认证]`, `[未认证]`, `[认证资产候选]`, and `[推荐指标候选]` in the `状态` or `审批关注点` columns, not as the `类型` value.
- Default recommendation export includes completed/authenticated context. Within each `业务主题域`, place returned `[已认证]` and `[未认证]` asset rows together in the same review table when both are present. If only one status appears, state that this reflects the current returned evidence scope, not an Agent-side pending-only filter or proof of whole-project certification coverage.
- In the main review table, show asset names as clickable Markdown links when `markdown_link` or `raw_url` is available. Do not show raw asset IDs as the primary object text; keep item identities and hashes in context for submit or debug.
- In the `来源证据` column, first use each asset row's `source_evidence[].markdown_link`/`raw_url`; for metric rows, use `source_report.markdown_link`/`raw_url`. Fall back to the work unit's `source_dashboard` or `source_reports` links only when the row has no direct `source_evidence`. Do not strip links from source evidence when the JSON provides them, and do not replace linked sources with unlinked generic text such as `相关报表`, `热门看板`, `来源看板`, `同名看板`, `同名报表`, `<业务>相关报表`, or bare report names. If the asset row itself is the source dashboard or source report, reuse that row's own link as the source evidence. If multiple linked sources support one row, show the most direct source link or a compact comma-separated list of source links.
- Show available decision signals from data, especially heat, user count, and impact degree. Do not invent missing values.
- Use plain-text review labels only: `[已认证]`, `[未认证]`, `[已有指标资产]`, `[推荐指标候选]`, `[认证资产候选]`, `[风险/冲突]`. Do not use HTML, font tags, color names, or color-dependent wording in the Agent answer.
- Risk/conflict text is required when `conflict_risks`, `previous_decision`, `action_state`, `actionable`, or `authentication_status` indicate semantic conflict, identity conflict, previous rejection/skip, non-actionable state, or an approval blocker.
- Do not show raw JSON as the final answer.
