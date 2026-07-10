# analysis property influence-list

Use when the user needs to list assets affected by property changes.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis property influence-list --project-id <project_id> --table-type <table_type> --prop-name <prop_name>
ae-cli analysis property influence-list --dry-run
```

Capability id: `metadata.property.influence_list`.

Input sends `project_id`, `table_type`, `prop_name`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | Yes | Property table type. |
| `--prop-name` | Yes | Property column name. |
