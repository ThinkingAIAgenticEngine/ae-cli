# analysis bi-panel-page-data export

Use for BI panel page data that may be large or long-running.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `export` command instead of `bi-panel-page-data run`.

Do not use this command for bounded inline previews; use `bi-panel-page-data run` when the requested result fits the sync data retrieval rule.

Command:

```bash
ae-cli analysis bi-panel-page-data export --project-id <project_id> --panel-id <panel_id> --page-key <page_key> --result-type charts [--chart-ids '["chart1"]'] [--artifact-format jsonl]
```

Input sends `project_id`, `panel_id`, `page_key`, `result_type`, and optional control, paging, cache, request, timeout, and format fields. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is the CLI output formatter. Async export has no inline row limit. Runtime defaults to and is capped at 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`. `--row-limit` and related BI page controls are chart/summary window controls, not the generic async artifact row policy; see [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, status fields, expiration fields, and possibly `query_context_id`. It does not expose inspect/download API paths; use the CLI commands below.

When `result_type=charts` and the backend can resolve chart SQL sources, the export descriptor and first artifact metadata line may include `query_context_id` plus `sources`. BI chart sources are SQL contexts, so `drilldown_available` and `result_cluster_available` are false unless the response explicitly says otherwise. Do not call model drilldown commands from a BI SQL context with `drilldown_available=false`.

Follow-up workflow:

1. Save `data.run_id` and `data.artifact_id` from the export response.
2. Poll status with `ae-cli analysis run inspect --run-id <run_id>`.
3. Continue polling while status is running or pending. Treat `COMPLETED` or `SUCCEEDED` as success, and `FAILED`, `CANCELED`, or `CANCELLED` as terminal failure.
4. On success, download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.
5. If the export is no longer needed, cancel with `ae-cli analysis query cancel --run-id <run_id>`.

Do not write custom Python/curl for polling or download unless the CLI command itself is unavailable.
