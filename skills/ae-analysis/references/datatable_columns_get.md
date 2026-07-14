# analysis-meta datatable columns-get

Use when the user needs to get columns for a project table reference.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta datatable columns-get --project-id <project_id> --table-ref <table_ref>
ae-cli analysis-meta datatable columns-get --dry-run
```

Capability id: `metadata.data_table.columns_get`.

Input sends `project_id`, `table_ref`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-ref` | Yes | Project table reference. |
