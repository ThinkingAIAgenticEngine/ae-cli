# analysis-meta property changelog-list

Use when the user needs to list property metadata change logs.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta property changelog-list --project-id <project_id> --table-type <table_type> --prop-name <prop_name>
ae-cli analysis-meta property changelog-list --dry-run
```

Capability id: `metadata.property.changelog_list`.

Input sends `project_id`, `table_type`, `prop_name`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | Yes | Property table type. |
| `--prop-name` | Yes | Property column name. |
