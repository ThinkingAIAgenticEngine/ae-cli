# analysis dashboard-daily-report send

Use when the user wants to send a dashboard daily report immediately.

Do not use for configuration changes. Use `dashboard-daily-report update`.

Command:

```bash
ae-cli analysis dashboard-daily-report send --project-id <project_id> --dashboard-id <dashboard_id> [--need-csv true] [--host-url <url>] [--payload '{...}'] --yes
```

Input sends `project_id`, `dashboard_id`, and optional daily report fields or `payload`.

Behavior:

- If no daily report config flags and no `--payload` are provided, the gateway uses the dashboard's saved daily report config.
- If the dashboard has no saved daily report config, the command fails with a stable business error instead of creating a misleading task.
- If any config flag or `--payload` is provided, the request config is used for this immediate send. Provide at least one valid channel, for example `--enable-dd true --dd-url '["https://..."]'`, or email fields such as `--enable-email true --email-login-users user@example.com`.
- Use `dashboard-daily-report update` to save or change scheduled daily report config.

Output is the gateway envelope. `data` contains the immediate send result.
