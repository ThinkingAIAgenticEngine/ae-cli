# analysis dashboard-report-data export

Use for dashboard report data queries that may be large or long-running.

Do not use when the user needs a tiny immediate preview. Use `dashboard-report-data run` with a small `--limit`.

Command:

```bash
ae-cli analysis dashboard-report-data export --project-id <project_id> --dashboard-id <dashboard_id> [--report-ids '[1,2]'] [--filters '{...}'] [--start-time <time>] [--end-time <time>] [--artifact-format jsonl]
```

Input sends `project_id`, `dashboard_id`, and optional `report_ids`, `filters`, `start_time`, `end_time`, `use_cache`, `request_id`, `timeout_seconds`, `format`. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is the CLI output formatter.

Output is the gateway envelope. `data` contains an async export descriptor such as `run_id`, `artifact_id`, status fields, inspect path, and download path.
