# analysis bi-panel-page-data export

Use for BI panel page data that may be large or long-running.

For full data, read [export handling](analysis_data_export.md) and use this `export` command instead of `bi-panel-page-data run`.

Do not use this command for bounded inline previews; use `bi-panel-page-data run` when the requested result fits the sync data retrieval rule.

Command:

```bash
ae-cli analysis bi-panel-page-data export --project-id <project_id> --panel-id <panel_id> --page-key <page_key> --result-type charts [--chart-ids '["chart1"]'] [--artifact-format jsonl] --output <file>
```

Input sends `project_id`, `panel_id`, `page_key`, `result_type=charts`, and optional chart, control, column, cache, request, timeout, and format fields. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is the CLI output formatter. The export does not accept row/block paging fields: Common streams chart rows directly and applies only `model_full_download_limit`. Runtime defaults to and is capped at 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`. BI summary is rendered presentation data; query it with `bi-panel-page-data run`.

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, status fields, and expiration fields. It does not create `query_context_id`. The CLI handles waiting and download with `--output`.

BI chart sources are SQL and do not support analysis drilldown or result-cluster creation. Exported rows are not interactive coordinates.

Use `--output` to wait and download the completed artifact. If interrupted, resume with `ae-cli analysis run wait --run-id <run_id> --output <file>` using the same export response. See [`run_wait.md`](run_wait.md).
