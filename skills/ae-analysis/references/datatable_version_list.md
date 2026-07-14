# analysis-meta datatable version-list

Use when the user needs to list data table historical versions.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta datatable version-list --project-id <project_id> --datatable-id <datatable_id>
ae-cli analysis-meta datatable version-list --dry-run
```

Capability id: `metadata.data_table_version.list`.

Input sends `project_id`, `datatable_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--datatable-id` | Yes | Data table ID. |
