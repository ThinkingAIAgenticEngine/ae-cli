---
name: ae-analysis-intent
description: TE data analysis skill for metric checks, report/dashboard queries, SQL analysis, funnel/retention/path analysis, user drilldown, detail queries, anomaly diagnosis, and alert configuration. Trigger this skill whenever the user asks to check data, analyze trends, explain metric changes, or export evidence. Always use ae-cli first; only fall back to te-mcp when ae-cli has no matching capability or repeatedly fails for confirmed non-parameter reasons.
---

# TE Analysis Skill

## Goals

- Help users locate the correct data assets: events, properties, metrics, reports, dashboards, models.
- Produce reproducible query results through command-driven execution first.
- Provide trend interpretation, anomaly assessment, evidence, and actionable next steps.

## Mandatory Rules

1. **Tool priority**
   - First priority: `ae-cli`.
   - Second priority: `te-mcp`, only when ae-cli has no matching capability or repeatedly fails for confirmed non-parameter reasons.
   - Builder validation errors, missing parameters, or `need_clarification` are not fallback reasons.

2. **`project_id` gate**
   - Confirm `project_id` before any project-scoped query.
   - If the user does not provide it and no verified project context exists, ask first. Do not guess.

3. **Ad-hoc analysis QP routing**
   - For `event`, `retention`, `funnel`, and `prop_analysis`, use the matching QP builder first.
   - Do not call `get_analysis_query_schema`, `list_events`, `list_properties`, `list_metrics`, or `get_metric` before these builders.
   - Only call `query_adhoc` when the builder returns `status=generated`.
   - If the builder returns `need_clarification`, `invalid_argument`, `unsupported_feature`, or `validation_error`, stop and ask/report the structured issue. Do not handcraft QP for these four models.
   - For `distribution`, `attribution`, `heat_map`, `interval`, `path`, `rank_list`, and `sql`, use the legacy schema/metadata path before constructing QP.

4. **Existing asset first**
   - Before ad-hoc analysis, search existing reports/dashboards when the request could match a saved business asset.
   - If a matching report/dashboard exists, query it instead of creating a redundant ad-hoc query.
   - Skip this only when the user explicitly asks for custom ad-hoc exploration or the saved asset does not cover required filters/groupings.

5. **Pre-check before write operations**
   - For create/update actions, run with `--dry-run` first whenever possible.
   - After a successful write, generate and return a resource link with `analysis_common +get_resource_url` when a resource ID is available.

6. **Absolute contribution attribution**
   - Mandatory: when attributing metric changes to dimensions, use absolute contribution decomposition. Do not judge the primary driver solely by relative change percentage.
   - See `F. ABSOLUTE_CONTRIBUTION_ATTRIBUTION` in the `ae-analysis` skill for the full algorithm and workflow.
   - Additive metrics: sort by `|delta_dim_i|`, not by `delta_dim_i / baseline`.
   - Ratio metrics: separate rate effects from composition effects and report hierarchically.
   - Self-check: verify that dimension contributions sum to approximately 100% before outputting.

## Capability Routing Rules

1. Check whether ae-cli has a matching command.
2. If yes, execute with ae-cli.
3. If ae-cli fails because of missing parameters, bad field types, bad time format, permissions, timeout, or invalid payload, fix and retry ae-cli first.
4. Fall back to te-mcp only for command-not-found, not-supported/not-implemented, clear capability gap, or repeated non-parameter failures.
5. When falling back, briefly state why ae-cli cannot satisfy the capability.

## Common ae-cli Capability Map

Command format:

```bash
ae-cli <service> +<command> [options]
```

### Project and resource

- List projects: `ae-cli analysis_common +list_projects`
- Generate resource link: `ae-cli analysis_common +get_resource_url -p <project_id> --resource_type <type> --resource_id <id>`

### Metadata discovery

- Event list: `ae-cli analysis_meta +list_events -p <project_id>`
- Property list: `ae-cli analysis_meta +list_properties -p <project_id>`
- Metric list: `ae-cli analysis_meta +list_metrics -p <project_id>`
- Table columns: `ae-cli analysis +get_table_columns -p <project_id> --table_ref <hive.schema.table|schema.table|table>`

### Report/dashboard queries

- Report list: `ae-cli analysis +list_reports -p <project_id>`
- Report definition: `ae-cli analysis +get_report_definition -p <project_id> -r <report_id>`
- Report data: `ae-cli analysis +query_report_data -p <project_id> --report_ids '[<report_id>]'`
- Dashboard list: `ae-cli analysis +list_dashboards -p <project_id>`
- Dashboard detail: `ae-cli analysis +query_dashboard_detail -p <project_id> -d <dashboard_id>`
- Dashboard report data: `ae-cli analysis +query_dashboard_report_data -p <project_id> -d <dashboard_id>`

### Ad-hoc analysis

Builder-supported models:

- Event QP builder: `ae-cli analysis +build_event_analysis_qp ...`
- Retention QP builder: `ae-cli analysis +build_retention_analysis_qp ...`
- Funnel QP builder: `ae-cli analysis +build_funnel_analysis_qp ...`
- Property analysis QP builder: `ae-cli analysis +build_prop_analysis_qp ...`
- Execute query: `ae-cli analysis +query_adhoc -p <project_id> --model_type <model_type> --qp '<builder_qp>'`

Legacy/manual models:

- Schema: `ae-cli analysis +get_analysis_query_schema --model_type <distribution|attribution|heat_map|interval|path|rank_list|sql>`
- Execute query: `ae-cli analysis +query_adhoc -p <project_id> --model_type <model_type> --qp '<manual_qp>'`

### Drilldown and details

- User drilldown: `ae-cli analysis +drilldown_users ...`
- User event sequence: `ae-cli analysis +drilldown_user_events ...`
- Entity details: `ae-cli analysis +query_entity_details ...`
- Event details: `ae-cli analysis +query_event_details ...`

## Standard Execution Flow

1. Clarify scope: KPI, model type, time window, dimensions, filters, and comparison baseline.
2. Confirm `project_id`.
3. Search existing reports/dashboards if the request may map to a saved business asset.
4. If a matching asset exists, query report/dashboard data.
5. If no existing asset is used:
   - `event` / `retention` / `funnel` / `prop_analysis`: builder -> `query_adhoc`
   - `distribution` / `attribution` / `heat_map` / `interval` / `path` / `rank_list` / `sql`: schema/metadata -> handcrafted QP -> `query_adhoc`
6. For anomalies, slice by channel/version/time/cohort first, then drill down to users and event chains when needed.
   - Strictly apply absolute contribution decomposition: compute each dimension's absolute delta and contribution share, then sort by absolute delta magnitude.
7. Return conclusion, key evidence, likely causes, limitations, and next actions.

## Output Requirements

- Put the core conclusion first.
- Include key data points: time, dimension, metric, value, and comparison baseline.
- Explain trend or anomaly causes with confidence level or validation needs.
- Provide actionable next-step recommendations.
- Do not dump raw tables only.
- If data, definitions, or permissions are insufficient, explicitly state the limitation and ask for the missing input.
- Attribution output requirements:
  - State the metric's total change in absolute and percentage terms in the core conclusion.
  - List dimension contributions sorted by absolute delta descending; each dimension shows dimension value, absolute delta, contribution share, and relative change.
  - Focus the conclusion on dimensions with the largest contribution share, not the largest relative change.
  - Self-check that all dimension contribution shares sum to approximately 100%; flag the result if deviation exceeds 5 percentage points.
