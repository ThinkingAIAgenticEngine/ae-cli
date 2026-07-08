# analysis favorite add

Use when the user wants to favorite one dashboard, BI panel, or folder.

Do not use for sharing or moving assets.

Command:

```bash
ae-cli analysis favorite add --project-id <project_id> [--asset-id <id>] [--asset-type dashboard|bi_panel|folder] [--space-id <space_id>] [--id <backend_id>] [--payload '{...}'] --yes
```

Input sends `project_id` and asset identity fields or backend-compatible `payload`.

Output is the gateway envelope. `data` contains the favorite result.
