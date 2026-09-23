# analysis dashboard-report-data export

Submit dashboard report data as a downloadable async artifact. Dashboard report data follows report-data model coverage: the 12 analysis report models from `ai_models.md` plus tag report data.

Reuse the selected dashboard and report IDs, resolve any unknown filters or requested physical route, then export with `--output <file>`. Read actual route fields from the exported result.

For full data, read [export handling](analysis_data_export.md) and use this `export` command instead of `dashboard-report-data run`.

Do not use this command for bounded inline previews; use `dashboard-report-data run` when the requested result fits the sync data retrieval rule.

Export uses the native full-download path and does not accept `--use-cache`; cache selection only applies to bounded `dashboard-report-data run` queries.

Command:

```bash
ae-cli analysis dashboard-report-data export --project-id <project_id> --dashboard-id <dashboard_id> [--report-ids '[1,2]'] [--filters '{...}'] [--cluster-query-scope GLOBAL|SLAVE] [--slave-cluster-id <id>] [--artifact-format jsonl] --output <file>
```

Omit cluster routing to follow the saved dashboard configuration. For an explicit route, use `GLOBAL` or `SLAVE` plus one physical cluster ID returned by `analysis query-cluster list`. SQL reports reject effective `GLOBAL`. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is only the CLI output formatter.

`--filters` uses the same AI-facing filter model as report data. The gateway resolves fields and compiles it to the dashboard backend filter. Do not pass a dashboard UI control dump or raw QP filter. Minimal shape:

```json
{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}
```

Dashboard `filters`, `start_time`, and `end_time` do not apply to SQL reports. Export still completes with SQL report data; the JSONL result object includes `warnings[]` with `OVERRIDE_IGNORED_FOR_MODEL`, affected SQL `report_ids`, and `ignored_fields`. Query SQL reports directly with report-data `--sql-params` when SQL conditions must change.

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, `effective_zone_offset` (the timezone actually selected for the export), status fields, and expiration fields. Exports do not create `query_context_id`. The CLI handles waiting and download through `--output`.

An empty artifact is successful and means the requested time range has no data. The run reaches `FAILED` only when every returned dashboard report entry contains an explicit execution error. Mixed dashboard exports retain successful data and explicit per-report failure entries.

Never use the export response or downloaded rows as a drilldown/result-cluster source. Run a bounded synchronous dashboard report preview containing the desired cell first.

Use `--output` to wait and download the completed artifact. If interrupted, resume with `ae-cli analysis run wait --run-id <run_id> --output <file>` using the same export response. See [`run_wait.md`](run_wait.md).
