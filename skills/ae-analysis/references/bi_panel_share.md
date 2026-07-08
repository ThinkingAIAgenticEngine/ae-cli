# analysis bi-panel share

Use when the user wants to modify BI panel sharing members.

Do not use to share dashboards or folders. Use the matching resource share command.

Command:

```bash
ae-cli analysis bi-panel share --project-id <project_id> --panel-id <panel_id> [--payload '{...}'] --yes
```

Input sends `project_id`, `panel_id`, and backend-compatible snake_case `payload`.

Output is the gateway envelope. `data` contains the share update result.
