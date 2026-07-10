# analysis dashboard-report-data run

Use for bounded inline dashboard report data queries when the expected result is small enough for immediate JSON output.

Do not use for large or long-running result sets. Use `dashboard-report-data export`.

Command:

```bash
ae-cli analysis dashboard-report-data run --project-id <project_id> --dashboard-id <dashboard_id> [--report-ids '[1,2]'] [--filters '{...}'] [--start-time <time>] [--end-time <time>] [--limit 100] [--timeout-seconds 60]
```

Input sends `project_id`, `dashboard_id`, and optional `report_ids`, `filters`, `start_time`, `end_time`, `use_cache`, `request_id`, `timeout_seconds`, `limit`.

`--filters` is an analysis Filter JSON injected as `commonFilter.aiFilter` for each queried report. It is not a dashboard UI control dump. Use `ae-cli analysis +get_filter_schema` for the exact schema. Minimal shape:

```json
{"relation":"and","filts":[{"field":{"type":"event_property","propertyName":"#event_name"},"operator":"equal","values":["login"]}]}
```

Output is the gateway envelope. `data` contains bounded inline report data.
