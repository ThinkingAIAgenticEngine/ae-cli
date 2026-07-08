# analysis dashboard-daily-report send

Use when the user wants to send a dashboard daily report immediately.

Do not use for configuration changes. Use `dashboard-daily-report update`.

Command:

```bash
ae-cli analysis dashboard-daily-report send --project-id <project_id> --dashboard-id <dashboard_id> [--need-csv 1] [--host-url <url>] [--payload '{...}'] --yes
```

Input sends `project_id`, `dashboard_id`, and optional `need_csv`, `host_url`, `payload`.

Output is the gateway envelope. `data` contains the immediate send result.
