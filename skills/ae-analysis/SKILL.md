---
name: ae-analysis
version: 3.1.0
description: "AE/TE/ThinkingEngine/ThinkingAI ae-cli manual for analysis-side tasks in the AE system or analysis platform: reports, dashboards, alerts, ad hoc analysis, drilldown, audience clusters, tags, tag members, metrics and metric definitions, events, properties, virtual events, virtual properties, metadata, project configuration, tracking plans, event tracking, mark times, project lists, and resource links. Use when the user asks to query, create, update, refresh, inspect, troubleshoot, govern, or manage these AE analysis assets. Must use ae-cli, read the matching references/<tool_name>.md command manual before composing commands, and never guess command names, flags, JSON payloads, project_id, resource IDs, or parameter formats."
---

# ae-analysis

> **CRITICAL - This skill is self-contained.** Use the Global AE CLI Rules below; do not require a separate shared skill for analysis-side tasks.
> **CRITICAL - For all commands that require `project_id`, you MUST satisfy `PROJECT_ID_GATE` first (no guessing): verify the project by ID/name with `analysis_common +list_projects` only when there is no valid project context yet, when the user switches project/host/environment, or when the supplied project is ambiguous. Reuse a project already verified in the same continuous conversation and same host/environment.**
> **CRITICAL - For write operations in this skill, you MUST complete the post-write link loop when applicable:** after success and extractable `resource_id`, call `analysis_common +get_resource_url` and return the main result + resource link (or explicit link-failure reason).
> **CRITICAL - Before running any `+<tool_name>` command, you MUST first read the corresponding `references/<tool_name>.md`.** The reference filename always equals the command name without the leading `+`, for example `+query_adhoc` -> `references/query_adhoc.md`.
> **CRITICAL - Before running any capability-gateway asset command such as `ae-cli analysis dashboard list`, `ae-cli analysis bi-panel get`, `ae-cli analysis project-space create`, or `ae-cli analysis public-link list`, read the matching `references/<resource>_<action>.md` file. Replace hyphens with underscores, for example `analysis dashboard list` -> `references/dashboard_list.md`, `analysis bi-panel get` -> `references/bi_panel_get.md`. Use [`references/analysis_gateway_assets.md`](references/analysis_gateway_assets.md) only as the overview matrix.**

## Global AE CLI Rules

AE CLI (`ae-cli`) is the command-line tool for the AE / TE / ThinkingEngine analysis platform. For AE analysis-side requests, prefer `ae-cli` and this skill's reference docs over model memory.

Global parameters:

| Parameter                | Description                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--format <json\|table>` | Output format. Default is JSON.                                                                                                                       |
| `--jq <expr>`            | jq filter expression for JSON output.                                                                                                                 |
| `--host <url>`           | Override the active AE host. Available on every command and may be placed after the subcommand, e.g. `ae-cli analysis dashboard list --host <url>`. |

Output and errors:

- Successful commands return machine-readable JSON by default.
- Failed commands return `{ "ok": false, "error": { "type": "...", "message": "...", "hint": "..." } }` and exit non-zero.

Safety constraints:

- Read commands can execute directly after required IDs and references are verified.
- Write commands require explicit user intent and normally keep the confirmation prompt.
- Never invent command names, flags, JSON payloads, `project_id`, resource IDs, field names, event names, property names, metric definitions, or date formats. For builder-supported ad-hoc models (`event`, `retention`, `funnel`, `prop_analysis`), do not pre-discover metadata; pass the user's event/property/metric wording to the matching QP builder and let the builder resolve metadata or return clarification. For non-builder/manual workflows, read the matching command reference and discover real project metadata first.
- **NEVER fabricate or guess resource names** (reports, dashboards, events, properties, metrics, clusters, tags, alerts). Always use list commands to discover real resources first. If a resource is not found after fuzzy search and full list fallback, explicitly tell the user "resource not found" and stop - do not proceed with fabricated names.

## When to Use

Use `ae-analysis` for all AE analysis-side work below:

- Domain `analysis`: alerts, reports/dashboards, ad-hoc model analysis, drilldown, entity/event details, schema helpers.
- Domain `analysis_audience`: clusters/tags and definition schemas.
- Domain `analysis_meta`: metadata governance, metrics, virtual metadata, project config, tracking plans, mark times, entity catalog (MCP). For **single** super-event / super-property **detail** on the capability gateway, switch to **`ae-metadata`** skill (`metadata event get`, `metadata property get`).
- Domain `analysis_common`: project listing and post-write resource links.

If user intent is Engage/DataOps/Community/metadata gateway detail, switch to `ae-engage` / `ae-dataops` / `ae-community` / **`ae-metadata`**.

## Command Format

- `ae-cli analysis +<tool_name> [options]`
- `ae-cli analysis_audience +<tool_name> [options]`
- `ae-cli analysis_meta +<tool_name> [options]`
- `ae-cli analysis_common +<tool_name> [options]`
- `ae-cli analysis <resource> <action> [options]` for capability-gateway dashboard, BI panel, project-space, folder, favorite, public-link, dashboard-definition, dashboard-daily-report, and async asset data commands.

Conventions:

- MCP `+<tool_name>` command flags use underscores, e.g. `--project_id`.
- Capability-gateway command flags use kebab-case, e.g. `--project-id`, `--dashboard-id`, `--request-id`. The CLI sends snake_case JSON to the gateway.
- MCP params map automatically to camelCase.
- JSON args pass as JSON string literals.
- Write operations require confirmation unless `--yes`.

## Capability Gateway Asset Commands

Use these commands for dashboard, BI panel, project space, folder, favorite, public link, dashboard definition import/export, dashboard daily report, and dashboard/BI page data operations:

```bash
ae-cli analysis dashboard list --project-id <project_id>
ae-cli analysis dashboard get --project-id <project_id> --dashboard-id <dashboard_id>
ae-cli analysis dashboard update --project-id <project_id> --operation settings --dashboard-id <dashboard_id> --payload '{...}'
ae-cli analysis dashboard-report-data export --project-id <project_id> --dashboard-id <dashboard_id>
ae-cli analysis bi-panel-page-data run --project-id <project_id> --panel-id <panel_id> --page-key <page_key> --result-type charts
ae-cli analysis project-space list --project-id <project_id>
ae-cli analysis query cancel --run-id <run_id>
```

Use capability-gateway asset commands when the user wants to manage or inspect:

- Dashboards, dashboard basic detail including creator/create time, dashboard sharing, dashboard notes, dashboard copy/freeze/handover/delete, abnormal info, task status.
- Dashboard report data that may be large or long-running. Prefer `dashboard-report-data export` for large results; use `run` only for bounded inline results.
- Dashboard definition export/import. Use `dashboard-definition import --validate-only true` for import pre-checks; do not look for a separate import-check command.
- Dashboard daily report update or immediate send.
- BI panel list/detail/create/update/delete/share/copy and BI page data. Prefer `bi-panel-page-data export` for large results.
- Project spaces, folders, favorites, and public links.

Do **not** use these commands for:

- Ad-hoc model analysis, report definition, report data, drilldown, entity/event details, metadata/schema helpers, alerts, audience clusters/tags, or project lookup. Use the existing `+<tool_name>` commands for those.
- Dashboard locks, BI panel version/lock, dashboard filter module, UI reorder/move/tree operations, daily report retry/download/get-config, public-link logs/source-list/get, or other product-manager-red-marked abilities.
- Internal-only or UI-only payloads unless the gateway command reference explicitly exposes them through `--payload`.

Capability-gateway output:

- Successful commands return the standard gateway envelope: `{ "ok": true, "data": ..., "meta": ... }`.
- Failed commands return `{ "ok": false, "error": ... }` and exit non-zero.
- Inline `run` data is bounded by `--limit` and `--timeout-seconds`.
- Export commands return `run_id`, `artifact_id`, artifact status, inspect path, and download path. Use `--artifact-format jsonl` for the artifact format; `--format` is reserved for CLI output formatting. Cancel with `ae-cli analysis query cancel --run-id <run_id>`.
- Unknown input fields and camelCase external fields are rejected by the gateway; use kebab-case CLI flags only.

See [`references/analysis_gateway_assets.md`](references/analysis_gateway_assets.md) for the command matrix. Before running one command, read its dedicated reference file named as `<resource>_<action>.md`.

## Mandatory Constraints

### A. PROJECT_ID_GATE

For any command requiring `project_id`:

1. If the same continuous conversation already has a verified project context (`project_id`, project name when known, and host/environment), reuse it directly for follow-up commands.
2. Call `analysis_common +list_projects` only when no verified project context exists, the user provides a new project ID/name, the user switches host/environment, the user asks to list projects, or the current project is ambiguous.
3. Verify any new user-provided ID or name against returned projects before using it.
4. If the user supplied an exact `project_id` and it uniquely matches one returned project in the intended host/environment, continue with that ID.
5. If the project is missing, the name is ambiguous, the host/environment is unclear, or the supplied ID/name does not uniquely match, show candidate projects and stop for user choice.
6. Do not use sample project IDs from reference docs as real IDs.
7. When reusing verified project context, mention the reused `project_id` briefly if it helps the user understand why `+list_projects` was not called again.

### B. Write-operation Post-link Completion

When these writes succeed and `resource_id` is extractable, call `analysis_common +get_resource_url` and append link output:

- `dashboard`: `analysis dashboard create`, `analysis dashboard update`
- `report`: `+create_report`
- `metric`: `+create_metric`, `+update_metric`
- `alert`: `+create_alert`, `+update_alert`
- `tag`: `+create_tag`, `+update_tag`
- `cluster`: `+create_cluster`, `+create_result_cluster`, `+update_cluster`
- `virtual_event`: `+create_virtual_event`
- `event_virtual_prop` / `user_virtual_prop`: `+create_virtual_property`
- `super_event` / `super_prop_event` / `super_prop_user`: `+batch_create_metadata`, `+batch_edit_metadata`

Closed-loop check (must be explicit in result):

- Write result
- `resource_id` checked
- `+get_resource_url` called or skipped (no ID)
- Link completion status

### C. FUZZY_SEARCH_FALLBACK

For list commands with `--query` parameter (`list_reports`, `analysis dashboard list`, `list_events`, `list_clusters`, `list_tags`, `list_alerts`, `list_metrics`):

1. **First attempt**: Use `--query` with user-provided keyword for fuzzy search
2. **If no results found**, retry up to 2 more times with:
   - Broader keywords (remove modifiers, use root words)
   - Alternative terms or synonyms
3. **After 3 failed fuzzy attempts**, fall back to full list (omit `--query`)
4. **Present full list** to user and ask them to identify the target resource
5. **Never proceed** with operations on non-existent resources

**Example workflow:**

- User asks: "Find active user report"
- Attempt 1: `--query "active user"` → no results
- Attempt 2: `--query "active"` → no results
- Attempt 3: `--query "user"` → no results
- Fallback: list all reports, show to user, ask for selection

### D. QUERY_EXISTING_FIRST

Before executing ad-hoc queries (`query_adhoc`), MUST check for existing reports/dashboards first:

**Mandatory workflow for data queries:**

1. **Identify user intent** - Extract what metrics/dimensions/filters the user wants
2. **Search existing reports** - Use `list_reports --query <keyword>` to find matching reports
3. **Search existing dashboards** - Use `analysis dashboard list --query <keyword>` to find matching dashboards
4. **If found** - Use `query_report_data` or `analysis dashboard-report-data run/export` to get data from existing assets
5. **If not found** - For QP builder-supported models (`event`, `retention`, `funnel`, `prop_analysis`), call the matching builder first and then call `query_adhoc` with builder `qp`; do not call schema or metadata tools between the report/dashboard miss and the builder. For all other `query_adhoc` models, use the legacy schema/metadata path.

**Rationale:**

- **Performance**: Existing reports are pre-computed and faster
- **Consistency**: Reports have business-defined metrics and calibrated logic
- **Resource efficiency**: Avoid redundant computation
- **Permissions**: Users may have report access but not ad-hoc query permissions

**Example:**

- User: "Query active users in last 7 days"
- Step 1: `list_reports --query "active user"` → found "DAU Active Users Report"
- Step 2: `query_report_data --report_id <id>` → return data
- ❌ WRONG: Directly use `query_adhoc` without checking existing reports

**Exceptions (when ad-hoc is acceptable):**

- User explicitly requests "ad-hoc query" or "ad-hoc analysis"
- User wants custom filters/groupings not available in existing reports
- User is exploring data for new insights (exploratory analysis)
- No matching reports found after search + fallback

### E. QP_BUILDER_SUPPORTED_MODELS_ONLY

QP builder supports exactly four ad-hoc model types: `event`, `retention`, `funnel`, and `prop_analysis`.

For these four model types, QP builder is mandatory before `query_adhoc`. Do not handcraft QP from `get_analysis_query_schema`, examples, or prior knowledge.

1. `event` -> `+build_event_analysis_qp`
2. `retention` -> `+build_retention_analysis_qp`
3. `funnel` -> `+build_funnel_analysis_qp`
4. `prop_analysis` -> `+build_prop_analysis_qp`

Builder-supported model routing is:

1. Search existing reports/dashboards if `QUERY_EXISTING_FIRST` applies.
2. If no existing asset is used, read the matching builder reference.
3. Call the matching builder with complete required parameters.
4. Call `query_adhoc` only when builder returns `status=generated`.

Do not insert metadata/schema calls between steps 2 and 3 for builder-supported models. Specifically, do not call `get_analysis_query_schema`, `list_events`, `list_properties`, `list_metrics`, `get_metric`, or `get_report_definition` to prepare the builder payload. The builder resolves event/property/metric metadata internally and returns `need_clarification` when it cannot.

Authenticated asset scope:

- Use `--authenticated_only true` on metadata list commands (`+list_events`, `+list_properties`, `+list_metrics`, `+list_clusters`, `+list_tags`) when the user explicitly asks to see only authenticated assets.
- Use `--authenticated_only true` on QP builders and cluster/tag definition builders when the generated QP/definition should resolve only authenticated assets.
- Do not pass `authenticated_only` or `authenticatedOnly` to `+query_adhoc`; the filter takes effect during metadata resolution and QP/definition construction, not query execution.
- List responses include `authenticationStatus` by default (`1` authenticated, `0` unauthenticated).

Event metric shortcut:

- If the user asks to query a saved/business metric through event analysis, pass the metric name/display name/remark directly as an event metric target: `--metrics '[{"event":"<metric name>"}]'`.
- Do not call `analysis_meta +list_metrics` or `analysis_meta +get_metric` first just to expand the metric definition.
- If the user provides an explicit formula, pass the formula and dependencies to `+build_event_analysis_qp`; do not convert it by reading schema or metric metadata first.

Metric result vs metric metadata:

- "Query metric result/value/trend over a time range" is an ad-hoc analysis request. Use report/dashboard search first when applicable, then builder -> `query_adhoc`.
- "Inspect/search/update/create metric definition" is metadata/governance. Only then use `analysis_meta +list_metrics`, `+get_metric`, `+create_metric`, or `+update_metric`.

For all other `query_adhoc` model types (`distribution`, `attribution`, `heat_map`, `interval`, `path`, `rank_list`, `sql`), QP builder is not supported. Use the legacy path: read `query_adhoc.md`, fetch schema/metadata as required, then construct QP manually according to the relevant schema.

Execution rule:

- If builder result `status=generated`, call `+query_adhoc` with the same `model_type` and the returned `qp`.
- If builder returns non-generated status (`need_clarification`, `invalid_argument`, `unsupported_feature`, `validation_error`), stop and ask the user for clarification instead of calling `query_adhoc`.
- Never bypass a failed builder by manually assembling QP for `event`, `retention`, `funnel`, or `prop_analysis`.

Builder payload rules:

- Before composing any builder JSON, read the matching builder reference doc. The builder references contain the required JSON shape and model-specific field differences.
- CLI flag names use snake_case, but nested JSON keys use the service DTO field names in camelCase. Correct: `startTime`, `endTime`, `relationEventPropertyName`, `eventPropertyName`. Wrong: `start_date`, `start_time`, `relation_property`, `fieldName`.
- Builder dry-run still requires the normal required flags. Do not run builder dry-run by itself.
- Do not pass placeholder `{}` or `[]` for required nested structures except when intentionally checking CLI validation. Fill required inner fields before calling the command.
- Use enum values exactly as documented. Examples: `mode=start_to_yesterday`, `operator=exists`, `relation=or`, `field.type=event_property`.
- For `exists`, `not_exists`, `is_true`, and `is_false`, omit `values`. For `between`, provide exactly two values. For other value-based operators, provide a non-empty `values` array.
- Builder tools do not execute the query and do not take `zone_offset`. Pass time zone to `+query_adhoc` with `--zone_offset` after the builder returns `status=generated`.
- If the user's request lacks a required business element such as time range, event, metric, funnel window, property, or relation field, stop and ask for clarification. If the request supplies a name but it may be a metadata ambiguity, call the builder and let it return candidates. Do not invent names or handcraft QP.

Supported builder chain:

1. Read the builder reference for the target model.
2. Build structured JSON from the user's request. Use user-provided event/property/metric names as-is; do not pre-query metadata for these names.
3. Run the matching `+build_*_analysis_qp` command.
4. If `status=generated`, call `+query_adhoc --model_type <same_model> --qp '<response.qp>'`.
5. If status is not `generated`, report the structured error or ask the user for the missing information; do not continue to `query_adhoc`.

Legacy query_adhoc chain:

1. Use only for `distribution`, `attribution`, `heat_map`, `interval`, `path`, `rank_list`, or `sql`.
2. Read `references/query_adhoc.md` and required schema/metadata references.
3. Build QP manually from the documented schema and verified project metadata.
4. Call `+query_adhoc`.

### F. ABSOLUTE_CONTRIBUTION_ATTRIBUTION

**When attributing a metric change to dimensions, you MUST use Absolute Contribution Decomposition. Never judge the primary driver based solely on relative change percentage.**

#### Problem Definition

Base rate fallacy causes inaccurate attribution:

| Dimension | Baseline | Comparison | Absolute Δ | Relative Δ | Contribution |
| --------- | -------- | ---------- | ---------- | ---------- | ------------ |
| A         | 1        | 5          | +4         | +400%      | **40%**      |
| B         | 50       | 55         | +5         | +10%       | **50%**      |
| C         | 49       | 50         | +1         | +2%        | **10%**      |

Wrong: "Dimension A grew 400%, it is the main driver."
Correct: "Dimension B contributed 50% of the absolute increase (+5), making it the primary driver."

#### Algorithm

##### Scenario 1: Additive Metrics

Use this for count-based metrics such as DAU, event counts, and payment amounts.

```
delta_total = V_total(comparison) - V_total(baseline)
delta_dim_i = V_dim_i(comparison) - V_dim_i(baseline)
contribution_pct_i = delta_dim_i / delta_total * 100%
```

- Sort by `|delta_dim_i|` in descending order.
- Do not sort by `delta_dim_i / V_dim_i(baseline)`.

##### Scenario 2: Ratio / Conversion Metrics

Ratio changes come from two components:

- **Composition effect**: changes in subgroup weight.
- **Rate effect**: changes in each subgroup's own rate.

Simplified mode is the default:

```
rate_change = R_total(comparison) - R_total(baseline)
```

Report subgroup rates hierarchically and call out structural impact in the conclusion.

Precise decomposition is only required when the user explicitly requests structural breakdown:

```
contribution_rate_i   = w_i(baseline) * [R_i(comparison) - R_i(baseline)]
contribution_weight_i = [w_i(comparison) - w_i(baseline)] * R_i(baseline)
```

Where `w_i` is the subgroup's share of total users.

#### Execution Workflow

1. Identify metric type: additive uses Scenario 1, ratio uses Scenario 2.
2. Fetch baseline total and dimension values with `query_adhoc` and grouped dimensions.
3. Fetch comparison total and dimension values with the same scope.
4. Compute `delta_dim_i` for each dimension.
5. Compute `contribution_pct_i = delta_dim_i / delta_total * 100%`.
6. Sort by absolute contribution magnitude and preserve sign.
7. Present the conclusion.

If the builder supports comparison mode for both periods in one query, prefer it to avoid two `query_adhoc` calls.

#### Output Format

```
Core conclusion: [Metric] from [baseline] to [comparison], changed by [±][absolute] ([±][percent])

Dimension contribution ranking (by absolute contribution, descending):
1. [dimension value] -> [±][absolute delta] (contributed [xx]%), relative change [±][percent]
2. [dimension value] -> [±][absolute delta] (contributed [xx]%), relative change [±][percent]
...

Conclusion: "[Metric] [increase/decrease] was primarily driven by [top dimension] (contributed [xx]% of the change), followed by [second dimension] ([xx]%)"
```

If any dimension shows a cross-effect, such as positive contribution but negative relative change, call it out explicitly.

#### Exceptions

Skip absolute contribution decomposition when:

- The user explicitly asks for growth-rate or percentage-change ranking only.
- The user asks for a single dimension's trend without cross-dimension comparison.
- A dimension baseline is zero; mark it as a new dimension separately.

#### Self-Check

After outputting attribution results, verify that dimension contributions sum to approximately 100%. If the sum deviates from 100% by more than 5 percentage points, flag that some dimensions may be missing or data scoping may be inconsistent.

## Tool Groups (100)

### analysis (61)

Alerts (6):
- `+get_alert_definition_schema` ([doc](references/get_alert_definition_schema.md))
- `+list_alerts` ([doc](references/list_alerts.md))
- `+get_alert` ([doc](references/get_alert.md))
- `+create_alert` ([doc](references/create_alert.md))
- `+update_alert` ([doc](references/update_alert.md))
- `+delete_alert` ([doc](references/delete_alert.md))

Reports:
- `+create_report` ([doc](references/create_report.md))
- `+get_report_definition` ([doc](references/get_report_definition.md))
- `+list_reports` ([doc](references/list_reports.md))
- `+query_report_data` ([doc](references/query_report_data.md))
- `+update_report` ([doc](references/update_report.md))
- `+delete_report` ([doc](references/delete_report.md))

Dashboard, BI panel, project-space, folder, favorite, public-link, dashboard-definition, dashboard-daily-report, and dashboard/BI data commands are capability-gateway commands. Use `ae-cli analysis <resource> <action>` after reading [`references/analysis_gateway_assets.md`](references/analysis_gateway_assets.md); do not use old `+` dashboard/space/BI/public-link command names.

Model Analysis (17):
- `+build_event_analysis_qp` ([doc](references/build_event_analysis_qp.md))
- `+build_retention_analysis_qp` ([doc](references/build_retention_analysis_qp.md))
- `+build_funnel_analysis_qp` ([doc](references/build_funnel_analysis_qp.md))
- `+build_prop_analysis_qp` ([doc](references/build_prop_analysis_qp.md))
- `+build_attribution_analysis_qp` ([doc](references/build_attribution_analysis_qp.md))
- `+build_distribution_analysis_qp` ([doc](references/build_distribution_analysis_qp.md))
- `+build_heat_map_analysis_qp` ([doc](references/build_heat_map_analysis_qp.md))
- `+build_interval_analysis_qp` ([doc](references/build_interval_analysis_qp.md))
- `+build_path_analysis_qp` ([doc](references/build_path_analysis_qp.md))
- `+build_rank_list_analysis_qp` ([doc](references/build_rank_list_analysis_qp.md))
- `+query_adhoc` ([doc](references/query_adhoc.md))
- `+cancel_query` ([doc](references/cancel_query.md))
- `+drilldown_users` ([doc](references/drilldown_users.md))
- `+drilldown_user_events` ([doc](references/drilldown_user_events.md))
- `+create_result_cluster` ([doc](references/create_result_cluster.md))
- `+load_filters` ([doc](references/load_filters.md))
- `+get_table_columns` ([doc](references/get_table_columns.md))

Entity/Event Details (4):

- `+query_entity_details` ([doc](references/query_entity_details.md))
- `+query_event_details` ([doc](references/query_event_details.md))
- `+build_entity_details_sql` ([doc](references/build_entity_details_sql.md))
- `+build_event_details_sql` ([doc](references/build_event_details_sql.md))

Schema (3):

- `+get_analysis_query_schema` ([doc](references/get_analysis_query_schema.md))
- `+get_filter_schema` ([doc](references/get_filter_schema.md))
- `+get_groupby_schema` ([doc](references/get_groupby_schema.md))

### analysis_audience (22)

Clusters (10):
- `+create_cluster` ([doc](references/create_cluster.md))
- `+get_clusters_by_name` ([doc](references/get_clusters_by_name.md))
- `+list_cluster_members` ([doc](references/list_cluster_members.md))
- `+list_clusters` ([doc](references/list_clusters.md))
- `+update_cluster` ([doc](references/update_cluster.md))
- `+refresh_cluster` ([doc](references/refresh_cluster.md))
- `+create_id_cluster` ([doc](references/create_id_cluster.md))
- `+update_id_cluster` ([doc](references/update_id_cluster.md))
- `+delete_cluster` ([doc](references/delete_cluster.md))
- `+build_cluster_definition` ([doc](references/build_cluster_definition.md))

Tags (10):
- `+create_tag` ([doc](references/create_tag.md))
- `+get_tags_by_name` ([doc](references/get_tags_by_name.md))
- `+list_tag_members` ([doc](references/list_tag_members.md))
- `+list_tags` ([doc](references/list_tags.md))
- `+update_tag` ([doc](references/update_tag.md))
- `+refresh_tag` ([doc](references/refresh_tag.md))
- `+create_id_tag` ([doc](references/create_id_tag.md))
- `+update_id_tag` ([doc](references/update_id_tag.md))
- `+delete_tag` ([doc](references/delete_tag.md))
- `+build_tag_definition` ([doc](references/build_tag_definition.md))

Schema Definitions (2):

- `+get_cluster_definition_schema` ([doc](references/get_cluster_definition_schema.md))
- `+get_tag_definition_schema` ([doc](references/get_tag_definition_schema.md))

### analysis_meta (24)

Metadata and Governance (11):
- `+list_events` ([doc](references/list_events.md))
- `+list_properties` ([doc](references/list_properties.md))
- `+list_metrics` ([doc](references/list_metrics.md))
- `+get_metric` ([doc](references/get_metric.md))
- `+create_metric` ([doc](references/create_metric.md))
- `+update_metric` ([doc](references/update_metric.md))
- `+delete_metric` ([doc](references/delete_metric.md))
- `+batch_edit_metadata` ([doc](references/batch_edit_metadata.md))
- `+batch_create_metadata` ([doc](references/batch_create_metadata.md))
- `+create_virtual_event` ([doc](references/create_virtual_event.md))
- `+create_virtual_property` ([doc](references/create_virtual_property.md))

Project and Tracking (11):

- `+get_project_config` ([doc](references/get_project_config.md))
- `+list_project_users` ([doc](references/list_project_users.md))
- `+get_track_program` ([doc](references/get_track_program.md))
- `+save_track_items` ([doc](references/save_track_items.md))
- `+delete_track_items` ([doc](references/delete_track_items.md))
- `+generate_track_program` ([doc](references/generate_track_program.md))
- `+generate_track_sdk_sample` ([doc](references/generate_track_sdk_sample.md))
- `+create_project_mark_time` ([doc](references/create_project_mark_time.md))
- `+update_project_mark_time` ([doc](references/update_project_mark_time.md))
- `+list_project_mark_times` ([doc](references/list_project_mark_times.md))
- `+delete_project_mark_times` ([doc](references/delete_project_mark_times.md))

Entity Catalog (2):

- `+create_entity` ([doc](references/create_entity.md))
- `+list_entities` ([doc](references/list_entities.md))

### analysis_common (2)

- `+list_projects` ([doc](references/list_projects.md))
- `+get_resource_url` ([doc](references/get_resource_url.md))

## Quick Verification

```bash
ae-cli analysis --help
ae-cli analysis_audience --help
ae-cli analysis_meta --help
ae-cli analysis_common --help
npm run verify:analysis-tools
npm run verify:analysis-audience-tools
npm run verify:analysis-meta-tools
npm run verify:analysis-common-tools
```

## Reference Docs

See the unified `references/` directory (79 command docs total).
