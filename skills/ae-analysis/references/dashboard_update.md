# analysis dashboard update

Use when the user wants to update dashboard settings in batch or upsert a dashboard note.

Do not use for moving/copying dashboards. Use `dashboard copy`, `dashboard handover`, or the relevant project-space/folder command.

Command:

```bash
ae-cli analysis dashboard update --project-id <project_id> --operation settings --dashboard-ids '[1001,1002]' [--zone-offset 8] [--payload '{...}'] --yes
ae-cli analysis dashboard update --project-id <project_id> --operation note-upsert --dashboard-id <dashboard_id> [--note-id <note_id>] [--note-title <title>] [--description <text>] --yes
```

Input sends `project_id`, `operation`, optional dashboard identifiers, setting fields (including `zone_offset` as hours, e.g. `8` for UTC+8), note fields, and optional `payload`.

Output is the gateway envelope. `data` contains the update result.
