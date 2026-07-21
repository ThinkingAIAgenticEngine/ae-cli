# analysis dashboard-daily-report update

Use when the user wants to update a dashboard daily report configuration.

Do not use to send immediately. Use `dashboard-daily-report send`.

Command:

```bash
ae-cli analysis dashboard-daily-report update --project-id <project_id> --dashboard-id <dashboard_id> [--enable-send true] [--send-time <time>] [--send-title <title>] [--send-content <content>] [--payload '{...}']
```

Input sends `project_id`, `dashboard_id`, and optional daily report fields or `payload`.

When `--payload` is absent, the command sends safe defaults expected by the gateway: `need_csv=false`, empty `host_url`, all channel switches false, `send_date=1,2,3,4,5,6,7`, `send_time=09:00`, `lang=zh-CN`, `screen_type=normal`, `zone_offset=0`, and `enable_send=false`. When `--payload` is present, payload values remain authoritative; pass top-level flags only for fields you intentionally want to override.

When enabling Feishu, pass `--enable-feishu true --feishu-info '{"app_id":"cli_xxx","app_secret":"secret_xxx","webhook":["https://open.feishu.cn/open-apis/bot/v2/hook/..."]}'`. All three fields are required because the backend uploads the dashboard image before calling the group-bot webhook. Treat `app_secret` as sensitive input.

Output is the gateway envelope. `data` contains the daily report configuration update result.
