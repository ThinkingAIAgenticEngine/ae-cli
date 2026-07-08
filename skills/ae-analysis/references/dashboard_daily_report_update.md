# analysis dashboard-daily-report update

Use when the user wants to update a dashboard daily report configuration.

Do not use to send immediately. Use `dashboard-daily-report send`.

Command:

```bash
ae-cli analysis dashboard-daily-report update --project-id <project_id> --dashboard-id <dashboard_id> [--enable-send 1] [--send-time <time>] [--send-title <title>] [--send-content <content>] [--payload '{...}'] --yes
```

Input sends `project_id`, `dashboard_id`, and optional daily report fields or `payload`.

Output is the gateway envelope. `data` contains the daily report configuration update result.
