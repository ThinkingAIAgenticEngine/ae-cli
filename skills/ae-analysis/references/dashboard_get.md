# analysis dashboard get

Use when the user needs one dashboard detail, including basic metadata such as creator and create/update time, settings, reports, notes, and sharing information.

Do not use to query report result data. Use `dashboard-report-data run` or `dashboard-report-data export`.

Command:

```bash
ae-cli analysis dashboard get --project-id <project_id> --dashboard-id <dashboard_id> [--use-cache true]
```

Input sends `project_id`, `dashboard_id`, and optional `use_cache`.

Output is the gateway envelope. `data` contains the dashboard detail returned by the capability gateway.
