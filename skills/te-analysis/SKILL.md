---
name: te-analysis
version: 2.0.0
description: "TE analysis query and visualization: report (report) and dashboard (dashboard) creation/query, ad-hoc model analysis, user drilldown, alert configuration, entity/event detail queries, analysis SQL, and filter/group-by schemas. Covers event analysis, retention analysis, funnel analysis, SQL analysis, user property analysis, distribution analysis, interval analysis, path analysis, and attribution analysis. Triggers when users mention check data/analyze data/view trends/view conversion funnels/view retention/run path attribution/write analysis SQL/drill into user behavior/edit reports and dashboards/configure alerts."
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli analysis --help"
---

# te-analysis

> **CRITICAL - Before starting, you MUST first read [`../te-shared/SKILL.md`](../te-shared/SKILL.md)**: authentication, host configuration, global parameters, and write-operation confirmation rules are all documented there.
> **CRITICAL - For write operations marked with ⚠️, after a successful execution you MUST first read and follow the "post-write link completion" constraint in [`../te-common/SKILL.md`](../te-common/SKILL.md). You MUST call `analysis_common +get_resource_url` to complete the link-completion loop.**
> **CRITICAL - For all commands that require `project_id`, you MUST follow `te-common`'s `PROJECT_ID_GATE` (stop if missing and confirm with the user).**
> **CRITICAL - Before running any `+<tool_name>` command, you MUST first read the corresponding reference document `./references/<tool-name>.md`.** For example: before running `+get_analysis_query_schema`, you must first read [`./references/get-analysis-query-schema.md`](./references/get-analysis-query-schema.md)

## When to Use

When a user needs TE for analysis queries, drilldown details, report/dashboard management, or alert configuration, use `te-analysis`.

It applies to requests such as viewing data, analyzing data, checking details, creating reports, and configuring alerts. If the request is for audiences/tags, tracking plans, or project configuration, switch to another skill.

- Alerts: view alert definitions, list alerts, get a single alert, create alerts, or update alerts.
  Common commands: `+get_alert_definition_schema`, `+list_alerts`, `+get_alert`, `+create_alert`, `+update_alert`
- Reports and dashboards: create or query reports, inspect dashboard structure and data, update dashboards, and manage public links and remarks.
  Common commands: `+create_report`, `+query_report_data`, `+create_dashboard`, `+query_dashboard_detail`, `+update_dashboard`
- Model analysis: run event analysis, retention analysis, funnel analysis, SQL analysis, user property analysis, distribution analysis, interval analysis, path analysis, attribution analysis, heat map, and ranking-list ad-hoc analysis, and support user drilldown and result clustering.
  Common commands: `+query_adhoc`, `+drilldown_users`, `+drilldown_user_events`, `+create_result_cluster`
- Entities and events: query entity details, event details, or generate the corresponding detail SQL.
  Common commands: `+query_entity_details`, `+query_event_details`, `+build_entity_details_sql`, `+build_event_details_sql`
- Analysis schema and helpers: get analysis query, filter, and groupby schemas, load available filter conditions, and inspect table columns.
  Common commands: `+get_analysis_query_schema`, `+get_filter_schema`, `+get_groupby_schema`, `+load_filters`, `+get_table_columns`

## When to Switch to Other Skills

When the user requests the following, switch to the corresponding skill:

| User Intent | Use |
|---------|--------|
| Create/query clusters, tags, or cluster schemas | `te-audience` |
| Manage tracking plans, project configuration, or entity lists | `te-meta` |
| Ops task flows, processes, or channels | `te-operation` |

## Parameters and Conventions

- Command format: `ae-cli analysis +<tool_name> [options]`
- CLI flags use underscores: `--project_id`
- MCP parameters map automatically to camelCase: `projectId`
- Pass JSON parameters directly as JSON strings: `'{}'`, `'[1,2]'`
- Write operations prompt for confirmation; use `--yes` to skip it.

## Tool Groups (31)

### Alerts (5)
- `+get_alert_definition_schema` ([doc](./references/get-alert-definition-schema.md))
- `+list_alerts` ([doc](./references/list-alerts.md))
- `+get_alert` ([doc](./references/get-alert.md))
- `+create_alert` ([doc](./references/create-alert.md))
- `+update_alert` ([doc](./references/update-alert.md))

### Reports and Dashboards (13)
- `+create_report` ([doc](./references/create-report.md)) ⚠️ write operation, after it succeeds you MUST call `analysis_common +get_resource_url` to complete the link-completion loop
- `+get_report_definition` ([doc](./references/get-report-definition.md))
- `+list_reports` ([doc](./references/list-reports.md))
- `+query_report_data` ([doc](./references/query-report-data.md))
- `+create_dashboard` ([doc](./references/create-dashboard.md)) ⚠️ write operation, after it succeeds you MUST call `analysis_common +get_resource_url` to complete the link-completion loop
- `+list_dashboards` ([doc](./references/list-dashboards.md))
- `+query_dashboard_detail` ([doc](./references/query-dashboard-detail.md))
- `+query_dashboard_report_data` ([doc](./references/query-dashboard-report-data.md))
- `+update_dashboard` ([doc](./references/update-dashboard.md)) ⚠️ write operation, after it succeeds you MUST call `analysis_common +get_resource_url` to complete the link-completion loop
- `+create_or_update_dashboard_note` ([doc](./references/create-or-update-dashboard-note.md))
- `+list_public_access_links` ([doc](./references/list-public-access-links.md))
- `+create_public_access_link` ([doc](./references/create-public-access-link.md))
- `+update_public_access_link` ([doc](./references/update-public-access-link.md))

### Model Analysis (6)
- `+query_adhoc` ([doc](./references/query-adhoc.md))
- `+drilldown_users` ([doc](./references/drilldown-users.md))
- `+drilldown_user_events` ([doc](./references/drilldown-user-events.md))
- `+create_result_cluster` ([doc](./references/create-result-cluster.md)) ⚠️ write operation, after it succeeds you MUST call `analysis_common +get_resource_url` to complete the link-completion loop
- `+load_filters` ([doc](./references/load-filters.md))
- `+get_table_columns` ([doc](./references/get-table-columns.md))

### Entity Details / Event Details
- `+query_entity_details` ([doc](./references/query-entity-details.md))
- `+query_event_details` ([doc](./references/query-event-details.md))
- `+build_entity_details_sql` ([doc](./references/build-entity-details-sql.md))
- `+build_event_details_sql` ([doc](./references/build-event-details-sql.md))

### Schema (8)
- `+get_analysis_query_schema` ([doc](./references/get-analysis-query-schema.md))
- `+get_filter_schema` ([doc](./references/get-filter-schema.md))
- `+get_groupby_schema` ([doc](./references/get-groupby-schema.md))

## Quick Verification

```bash
ae-cli analysis --help
npm run verify:analysis-tools
# Example: use dry-run to preview the request (replace project_id with your actual project ID)
ae-cli analysis +query_adhoc --project_id <YOUR_PROJECT_ID> --model_type event --qp "{}" --dry-run
```

## Reference Docs

See the `references/` directory (31 per-command docs in total).
