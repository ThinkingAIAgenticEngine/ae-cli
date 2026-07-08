# analysis bi-panel get

Use when the user needs one BI panel's released page structure.

Do not use to query chart data. Use `bi-panel-page-data run` or `bi-panel-page-data export`.

Command:

```bash
ae-cli analysis bi-panel get --project-id <project_id> --panel-id <panel_id> [--fields '["pages"]']
```

Input sends `project_id`, `panel_id`, and optional `fields`.

Supported fields are `basic`, `pages`, `charts`, `chartFilterControls`, `summary`,
`parameterControls`, and `permissionControls`.

Output is the gateway envelope. `data` contains the BI panel structure.
