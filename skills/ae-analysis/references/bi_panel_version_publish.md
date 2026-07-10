# analysis bi-panel-version publish

Use when the user wants to publish the current BI panel draft so `bi-panel get`
and BI page-data queries can read it as a released/queryable version.

Do not use this command blindly after `bi-panel update`. First inspect the draft with
`bi-panel-version get --version-type draft` and use the returned `data.version`
as `--source-version`. The gateway rejects stale `source_version` values.

Command:

```bash
ae-cli analysis bi-panel-version publish --project-id <project_id> --panel-id <panel_id> --source-version <draft_version> --yes
```

Input sends `project_id`, one of `panel_id` or `panel_uuid`, and required
`source_version`.

Output is the gateway envelope. `data` contains `panel_id`, `panel_uuid`,
`source_version_type`, `source_version`, and `published_version`.
