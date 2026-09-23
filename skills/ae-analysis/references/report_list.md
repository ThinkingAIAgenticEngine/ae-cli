# analysis report list

Use when the user needs a directory of reports they can edit or manage in a project, with optional keyword search, semantic model filtering, certification filtering, field projection, and inline pagination. The result includes both self-created and shared reports when effective report-edit permission is present; it excludes shared read-only reports.

Do not use for readable asset discovery: use `analysis asset search`, which includes shared read-only reports and dashboards. Do not use for report data execution or report definition writes. Use `report-data run/export` for data and `report create/update` for writes.

Command:

```bash
ae-cli analysis report list --project-id <project_id> [--queries '["growth","retention"]'] [--model-types '["event","sql","tag","revenue"]'] [--fields '["report_id","report_name","report_desc","report_model","version"]'] [--certification-scope project|certified|all] [--limit 50] [--offset 0]
```

Input sends `project_id`, optional `queries`, `model_types`, `fields`, `certification_scope`, `limit`, and `offset` as snake_case gateway input. `queries` is a JSON array of 1 to 20 non-empty strings with OR semantics; matching rows include `matched_queries` and `matched_fields`. The legacy singular `query` is not accepted. `limit` defaults to 50 and must be 1..200; out-of-range values are rejected rather than silently clamped.

Output is the gateway envelope. `data` contains report summaries, `total`, effective `limit`, `offset`, `has_more`, and nullable `next_offset`. When `has_more` is true, use exactly `next_offset` for the next call; stop when it is false. Include `version` in `--fields` when the next step is `analysis report update`.

When locating manageable reports for an edit or management workflow, group known names into one `--queries` call or narrow with `--model-types` before paging. Stop when the required reports are found; do not issue one list call per name.

Search matches report names and descriptions, not events inside definitions. Inspect a suitable candidate with `report get` when its definition is not already available; use [metadata resolution](metadata_resolution.md) for a business-measure lookup.
