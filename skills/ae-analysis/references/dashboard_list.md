# analysis dashboard list

Use `analysis dashboard list --manageable-only` to select dashboards for edit or management workflows. Without this flag the command returns all readable dashboards within the requested filters, including shared read-only dashboards.

Do not use for readable asset discovery: use `analysis asset search`, which includes shared read-only reports and dashboards. Do not use for dashboard report data. Use `dashboard-report-data run` or `dashboard-report-data export` instead.

Command:

```bash
ae-cli analysis dashboard list --project-id <project_id> --manageable-only [--queries '["growth","retention"]'] [--fields '["dashboard_id","dashboard_name"]'] [--certification-scope project|certified|all] [--limit 50] [--offset 0]
```

Input uses `project_id` plus optional `manageable_only` (boolean, default false), `queries`, `fields`, `certification_scope`, `limit`, and `offset`. `queries` is a JSON array of 1 to 20 non-empty strings; values use OR semantics. Matching rows include `matched_queries` and `matched_fields`. `--fields` accepts only `dashboard_id`, `dashboard_name`, and `remark`. Input and output both use snake_case; do not use `query`, `dashboardId`, `dashboardName`, generic `id`, or generic `name`.

When `has_more=true`, continue only with the returned `next_offset`; do not calculate the next page locally.

Output is the gateway envelope. `data` contains dashboard summaries and paging metadata when returned by the gateway.
