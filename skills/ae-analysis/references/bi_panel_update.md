# analysis bi-panel update

Use when the user wants to update BI panel content or metadata.

Do not use for BI panel version or lock workflows; those are intentionally not CLI-enabled.

Command:

```bash
ae-cli analysis bi-panel update --project-id <project_id> [--panel-name <name>] [--panel-uuid <uuid>] [--payload '{...}'] --yes
```

Input sends `project_id`, optional `panel_name`, `panel_uuid`, and `payload`.

Output is the gateway envelope. `data` contains the update result.
