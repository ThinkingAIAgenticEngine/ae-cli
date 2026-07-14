# analysis-meta datatable version-get

Use when the user needs to get data table version detail.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta datatable version-get --project-id <project_id> --version-id <version_id>
ae-cli analysis-meta datatable version-get --dry-run
```

Capability id: `metadata.data_table_version.get`.

Input sends `project_id`, `version_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--version-id` | Yes | Data table version ID. |
