# analysis dashboard-report-data run

Execute bounded inline dashboard report data queries. Dashboard report data follows report-data model coverage: the 12 analysis report models from `ai_models.md` plus tag report data.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `run` command instead of `dashboard-report-data export`.

Do not use this command for full, unknown-size, larger than 1000-row, or long-running dashboard report data; use `dashboard-report-data export`.

Command:

```bash
ae-cli analysis dashboard-report-data run --project-id <project_id> --dashboard-id <dashboard_id> [--report-ids '[1,2]'] [--filters '{...}'] [--start-time <time>] [--end-time <time>] [--zone-offset <offset>] [--limit 100] [--timeout-seconds 180]
```

Input sends `project_id`, `dashboard_id`, and optional `report_ids`, `filters`, `start_time`, `end_time`, `zone_offset`, `use_cache`, `request_id`, `timeout_seconds`, `limit`. When `--zone-offset` is specified, that timezone is used for every selected non-SQL report. When omitted, the current user's `currentTimezone` is used when available, otherwise the project default. Fixed UTC offsets are `-12` through `14`; `99` is local-time mode and is not UTC+99. Control defaults: `--limit` default 100 / max 1000, `--timeout-seconds` default and max 180. An explicitly supplied lower timeout still wins. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

`--filters` uses the same AI-facing filter model as report data. The gateway resolves fields and compiles it to the dashboard backend filter. Do not pass a dashboard UI control dump or raw QP filter. Minimal shape:

```json
{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}
```

Dashboard `filters`, `start_time`, and `end_time` do not apply to SQL reports. The query still succeeds and returns those SQL report results. Inspect `data.warnings[]`; `OVERRIDE_IGNORED_FOR_MODEL` contains the affected SQL `report_ids` and `ignored_fields`. To change SQL conditions, query the SQL report directly with `analysis report-data run` and saved `definition.params` through `--sql-params`.

Output is the gateway envelope. `data.effective_zone_offset` is the timezone actually used by the query, and each report source repeats it as `sources[].effective_zone_offset`. `data` also contains bounded inline report data, optional structured `warnings`, plus `query_context_id` and per-report `sources[].drilldown` options when a returned report exposes follow-up actions. Unsupported report models have empty actions.

An empty dashboard batch or report result with no rows is a successful query: it means the requested time range has no data. The command fails only when every returned report entry contains an explicit execution error. Mixed dashboard batches keep successful data and return `meta.partial`, counts, and per-report `meta.failures`.

Read [`analysis_drilldown_contract.md`](analysis_drilldown_contract.md). Pass the selected report source and merge only its returned coordinate fragments for the advertised action. Do not pass raw QP.
