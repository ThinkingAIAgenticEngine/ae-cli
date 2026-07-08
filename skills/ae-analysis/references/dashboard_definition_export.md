# analysis dashboard-definition export

Use when the user wants to export dashboard definition JSON for selected dashboard folders or shared spaces.

Do not use for dashboard report result data. Use `dashboard-report-data run` or `dashboard-report-data export`.

Command:

```bash
ae-cli analysis dashboard-definition export --project-id <project_id> [--dashboard-folder-ids '[...]'] [--shared-spaces '[...]'] [--export-file-name <name>] [--payload '{...}']
```

Input sends `project_id` and optional `dashboard_folder_ids`, `shared_spaces`, `export_file_name`, `payload`.

Output is the gateway envelope. `data` contains exported definition data or an export descriptor.
