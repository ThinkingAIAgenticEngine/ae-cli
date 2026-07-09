# analysis bi-panel-page-data export

Use for BI panel page data that may be large or long-running.

Do not use for tiny previews. Use `bi-panel-page-data run` with a small limit.

Command:

```bash
ae-cli analysis bi-panel-page-data export --project-id <project_id> --panel-id <panel_id> --page-key <page_key> --result-type charts [--chart-ids '["chart1"]'] [--artifact-format jsonl]
```

Input sends `project_id`, `panel_id`, `page_key`, `result_type`, and optional control, paging, cache, request, timeout, and format fields. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is the CLI output formatter.

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, status fields, and expiration fields. It does not expose inspect/download API paths; use the CLI commands below.

Follow-up workflow:

1. Save `data.run_id` and `data.artifact_id` from the export response.
2. Poll status with `ae-cli analysis run inspect --run-id <run_id>`.
3. Continue polling while status is running or pending. Treat `COMPLETED` or `SUCCEEDED` as success, and `FAILED`, `CANCELED`, or `CANCELLED` as terminal failure.
4. On success, download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.
5. If the export is no longer needed, cancel with `ae-cli analysis query cancel --run-id <run_id> --yes`.

Do not write custom Python/curl for polling or download unless the CLI command itself is unavailable.
