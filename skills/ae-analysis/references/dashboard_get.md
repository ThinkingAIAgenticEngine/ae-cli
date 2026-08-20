# analysis dashboard get

Use when the user needs one dashboard detail or when an agent needs the business context for dashboard report data. The detail includes location, creator and create/update time, settings, reports, notes, and sharing information.

Do not use to query report result data. Use `dashboard-report-data run` or `dashboard-report-data export`.

Command:

```bash
ae-cli analysis dashboard get --project-id <project_id> --dashboard-id <dashboard_id> [--use-cache true]
```

Input sends `project_id`, `dashboard_id`, and optional `use_cache`.

Output is the gateway envelope. `data` contains the dashboard detail returned by the capability gateway. Business-context fields are stable snake_case:

- `dashboard_id`, `dashboard_name`, and optional `remark` identify and describe the dashboard.
- `location` always contains `space_id`, `space_name`, `folder_id`, and `folder_name`; values are null when that level does not apply. `folder_name` is the immediate parent folder.
- `notes` is an array whose items contain `note_id`, `note_title`, and `description`.

When this detail is fetched before a dashboard data query, preserve non-empty `location.folder_name`, `dashboard_name`, `remark`, and `notes[].note_title/description` as dashboard context. Use them to interpret the report results, but distinguish this authored context from conclusions observed in the queried data.
