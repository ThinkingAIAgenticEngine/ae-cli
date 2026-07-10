# analysis property delete

Use when the user needs to batch delete properties or virtual properties.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis property delete --project-id <project_id> --table-type <table_type> --prop-names '{}'
ae-cli analysis property delete --dry-run
```

Capability id: `metadata.property.delete`.

Input sends `project_id`, `table_type`, `prop_names`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | Yes | Property table type. |
| `--prop-names` | Yes | Property names JSON array, or a JSON string accepted by common-service. |
