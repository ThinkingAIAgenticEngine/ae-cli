# analysis dashboard-report-data export

Use for dashboard report data queries that may be large or long-running.

Do not use when the user needs a tiny immediate preview. Use `dashboard-report-data run` with a small `--limit`.

Command:

```bash
ae-cli analysis dashboard-report-data export --project-id <project_id> --dashboard-id <dashboard_id> [--report-ids '[1,2]'] [--filters '{...}'] [--start-time <time>] [--end-time <time>] [--artifact-format jsonl]
```

Input sends `project_id`, `dashboard_id`, and optional `report_ids`, `filters`, `start_time`, `end_time`, `use_cache`, `request_id`, `timeout_seconds`, `format`. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is the CLI output formatter.

`--filters` is an analysis Filter JSON injected as `commonFilter.aiFilter` for each queried report. It is not a dashboard UI control dump. Use `ae-cli analysis +get_filter_schema` for the exact schema. Minimal shape:

```json
{"relation":"and","filts":[{"field":{"type":"event_property","propertyName":"#event_name"},"operator":"equal","values":["login"]}]}
```

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, status fields, and expiration fields. It does not expose inspect/download API paths; use the CLI commands below.

Follow-up workflow:

1. Save `data.run_id` and `data.artifact_id` from the export response.
2. Poll status with `ae-cli analysis run inspect --run-id <run_id>`.
3. Continue polling while status is running or pending. Treat `COMPLETED` or `SUCCEEDED` as success, and `FAILED`, `CANCELED`, or `CANCELLED` as terminal failure.
4. On success, download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.
5. If the export is no longer needed, cancel with `ae-cli analysis query cancel --run-id <run_id> --yes`.

Do not write custom Python/curl for polling or download unless the CLI command itself is unavailable.
