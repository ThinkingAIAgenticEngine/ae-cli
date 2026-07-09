# analysis dashboard-daily-report send

Use when the user wants to send a dashboard daily report immediately.

Do not use for configuration changes. Use `dashboard-daily-report update`.

Command:

```bash
ae-cli analysis dashboard-daily-report send --project-id <project_id> --dashboard-id <dashboard_id> [--need-csv true] [--host-url <url>] [--payload '{...}'] --yes
```

Input sends `project_id`, `dashboard_id`, and optional daily report fields or `payload`.

When `--payload` is absent, the command sends safe defaults expected by the gateway: `need_csv=false`, empty `host_url`, all channel switches false, `send_date=1,2,3,4,5,6,7`, `send_time=09:00`, `lang=zh-CN`, `screen_type=normal`, and `zone_offset=0`. When `--payload` is present, payload values remain authoritative; pass top-level flags only for fields you intentionally want to override.

Output is the gateway envelope. `data` contains the immediate send result.
