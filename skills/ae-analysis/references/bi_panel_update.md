# analysis bi-panel update

Use when the user wants to update BI panel content or metadata.

Do not use this command to verify draft content or publish a draft. `bi-panel get`
reads only the released/queryable version. Use `bi-panel-version get` to inspect
`release` or `draft`, and `bi-panel-version publish` to publish a matching draft
`source_version`.

Command:

```bash
ae-cli analysis bi-panel update --project-id <project_id> [--panel-name <name>] [--panel-uuid <uuid>] [--payload '{...}']
```

Input sends `project_id`, optional `panel_name`, `panel_uuid`, and `payload`.

Output is the gateway envelope. `data` contains the update result.
