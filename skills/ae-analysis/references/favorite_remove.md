# analysis favorite remove

Use when the user wants to remove favorite from one dashboard, BI panel, or folder.

Do not use to delete the asset itself.

Command:

```bash
ae-cli analysis favorite remove --project-id <project_id> [--asset-id <id>] [--asset-type dashboard|bi_panel|folder] [--space-id <space_id>] [--id <backend_id>] [--payload '{...}']
```

Input sends `project_id` and asset identity fields or backend-compatible `payload`.

Output is the gateway envelope. `data` contains the remove-favorite result.
