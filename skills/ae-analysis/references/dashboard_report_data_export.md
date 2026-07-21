# analysis dashboard-report-data export

Submit dashboard report data as a downloadable async artifact. Dashboard report data follows report-data model coverage: the 12 analysis report models from `ai_models.md` plus tag report data.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `export` command instead of `dashboard-report-data run`.

Do not use this command for bounded inline previews; use `dashboard-report-data run` when the requested result fits the sync data retrieval rule.

Command:

```bash
ae-cli analysis dashboard-report-data export --project-id <project_id> --dashboard-id <dashboard_id> [--report-ids '[1,2]'] [--filters '{...}'] [--start-time <time>] [--end-time <time>] [--zone-offset <offset>] [--artifact-format jsonl]
```

Input sends `project_id`, `dashboard_id`, and optional `report_ids`, `filters`, `start_time`, `end_time`, `zone_offset`, `use_cache`, `request_id`, `timeout_seconds`, `format`. When `--zone-offset` is specified, that timezone is used for every selected non-SQL report. When omitted, the current user's `currentTimezone` is used when available, otherwise the project default. Fixed UTC offsets are `-12` through `14`; `99` is local-time mode and is not UTC+99. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is the CLI output formatter. Async export has no inline row limit. Runtime defaults to and is capped at 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

`--filters` uses the same AI-facing filter model as report data. The gateway resolves fields and compiles it to the dashboard backend filter. Do not pass a dashboard UI control dump or raw QP filter. Minimal shape:

```json
{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}
```

Dashboard `filters`, `start_time`, and `end_time` do not apply to SQL reports. Export still completes with SQL report data; the JSONL result object includes `warnings[]` with `OVERRIDE_IGNORED_FOR_MODEL`, affected SQL `report_ids`, and `ignored_fields`. Query SQL reports directly with report-data `--sql-params` when SQL conditions must change.

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, `effective_zone_offset` (the timezone actually selected for the export), status fields, and expiration fields. Exports do not create `query_context_id`. It does not expose inspect/download API paths; use the CLI commands below.

An empty artifact is successful and means the requested time range has no data. The run reaches `FAILED` only when every returned dashboard report entry contains an explicit execution error. Mixed dashboard exports retain successful data and explicit per-report failure entries.

Never use the export response or downloaded rows as a drilldown/result-cluster source. Run a bounded synchronous dashboard report preview containing the desired cell first.

Follow-up workflow:

1. Save `data.run_id` and `data.artifact_id` from the export response.
2. Poll status with `ae-cli analysis run inspect --run-id <run_id>`.
3. Continue polling while status is running or pending. Treat `COMPLETED` or `SUCCEEDED` as success, and `FAILED`, `CANCELED`, or `CANCELLED` as terminal failure.
4. On success, download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.
5. If the export is no longer needed, cancel with `ae-cli analysis query cancel --run-id <run_id>`.

Do not write custom Python/curl for polling or download unless the CLI command itself is unavailable.
