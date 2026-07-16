# analysis dashboard update

Use when the user wants to update dashboard settings in batch or upsert a dashboard note.

Do not use for moving/copying dashboards. Use `dashboard copy`, `dashboard handover`, or the relevant project-space/folder command.

Command:

```bash
ae-cli analysis dashboard update --project-id <project_id> --operation settings --dashboard-ids '[1001,1002]' [--zone-offset 8] [--payload '{...}']
ae-cli analysis dashboard update --project-id <project_id> --operation settings --dashboard-id <dashboard_id> --refresh-type 1 --dashboard-status normal --payload '{"dashboard_job_schedule":"0 0 8 * * ?","time_config_open":true,"time_config":{},"cache_config":{},"schedule_ui_config":{}}'
ae-cli analysis dashboard update --project-id <project_id> --operation note-upsert --dashboard-id <dashboard_id> [--note-id <note_id>] [--note-title <title>] [--description <text>]
```

For `operation=settings`:

- identify one dashboard with `dashboard_id`, or a batch with `dashboard_ids`;
- `refresh_type` is integer `0` (real-time) or `1` (scheduled);
- `dashboard_status` is string `normal` or `freeze`;
- `zone_offset` is an integer hour offset from `-12` to `14`;
- complex settings belong in snake_case `payload`: `reports_version` string, `dashboard_job_schedule` string, `time_config_open` boolean, and object fields `time_config`, `cache_config`, `schedule_ui_config`; `ui_config` may be a string or object.

For `operation=note-upsert`, pass `dashboard_id`; omit `note_id` to create a note or pass it to update an existing note. Do not mix note fields with batch settings fields.

Output is the gateway envelope. `data` contains the update result.
