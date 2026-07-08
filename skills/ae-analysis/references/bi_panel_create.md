# analysis bi-panel create

Use when the user explicitly wants to create a BI panel.

Do not use to copy an existing BI panel. Use `bi-panel copy`.

Command:

```bash
ae-cli analysis bi-panel create --project-id <project_id> [--panel-name <name>] [--panel-uuid <uuid>] [--space-id <space_id>] [--folder-id <folder_id>] [--payload '{...}'] --yes
```

Input sends `project_id` plus optional BI panel identifiers, target IDs, and `payload`.

Output is the gateway envelope. `data` contains the created BI panel result.
