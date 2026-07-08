# analysis dashboard create

Use when the user explicitly wants to create a dashboard in personal space, a project space, or a folder.

Do not use to copy an existing dashboard. Use `dashboard copy` for copy workflows.

Command:

```bash
ae-cli analysis dashboard create --project-id <project_id> --dashboard-name <name> [--space-id <space_id>] [--folder-id <folder_id>] [--initial-report-id <report_id>] [--payload '{...}'] --yes
```

Input sends `project_id`, `dashboard_name`, and optional `space_id`, `folder_id`, `initial_report_id`, `payload`.

Output is the gateway envelope. `data` contains the created dashboard identity or backend create result.
