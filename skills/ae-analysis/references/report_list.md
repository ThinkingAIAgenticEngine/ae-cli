# analysis report list

Use when the user needs to find reports they can access in a project, with optional keyword search, semantic model filtering, field projection, and inline pagination.

Do not use for report data execution or report definition writes. Use `report-data run/export` for data and `report create/update` for writes.

Command:

```bash
ae-cli analysis report list --project-id <project_id> [--query <keyword>] [--model-types '["event","sql","tag","revenue"]'] [--fields '["report_id","report_name","report_desc","report_model","version"]'] [--limit 50] [--offset 0]
```

Input sends `project_id`, optional `query`, `model_types`, `fields`, `limit`, and `offset` as snake_case gateway input. `limit` defaults to 50 and must be 1..200; out-of-range values are rejected rather than silently clamped.

Output is the gateway envelope. `data` contains report summaries, `total`, effective `limit`, `offset`, `has_more`, and nullable `next_offset`. When `has_more` is true, use exactly `next_offset` for the next call; stop when it is false. Include `version` in `--fields` when the next step is `analysis report update`.

When locating one report, narrow with `--query` or `--model-types` before paging and stop when the required report is found; do not enumerate every report page when the server-side filters can identify the target.
