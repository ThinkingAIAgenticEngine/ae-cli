# analysis dashboard copy

Use when the user wants to copy a dashboard, optionally copying reports and targeting a project space or folder.

Do not use to create a blank dashboard. Use `dashboard create`.

Command:

```bash
ae-cli analysis dashboard copy --project-id <project_id> --dashboard-id <source_dashboard_id> --dashboard-name <new_name> [--report-copy true] [--to-space-id <space_id>] [--to-folder-id <folder_id>] --yes
```

Input sends `project_id`, `dashboard_id`, `dashboard_name`, and optional `report_copy`, `to_space_id`, `to_folder_id`.

Output is the gateway envelope. `data` contains the copied dashboard result.
