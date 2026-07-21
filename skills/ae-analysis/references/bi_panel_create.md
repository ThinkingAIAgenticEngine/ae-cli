# analysis bi-panel create

Use when the user explicitly wants to create the product's BI dashboard (`仪表盘`), including requests phrased as `BI 仪表盘`.

Do not use for an analysis board (`看板`); use `analysis dashboard create` instead. Do not use to copy an existing BI dashboard; use `bi-panel copy`.

Command:

```bash
ae-cli analysis bi-panel create --project-id <project_id> [--panel-name <name>] [--panel-uuid <uuid>] [--space-id <space_id>] [--folder-id <folder_id>] [--payload '{...}']
```

Input sends `project_id` plus optional BI panel identifiers, target IDs, and `payload`.

Output is the gateway envelope. `data` contains the created BI-dashboard result.
