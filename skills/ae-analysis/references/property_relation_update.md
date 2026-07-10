# analysis property relation-update

Use when the user needs to update property type, connection relation, or event mapping.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis property relation-update --project-id <project_id> --table-type <table_type> --payload '{}'
ae-cli analysis property relation-update --dry-run
```

Capability id: `metadata.property.relation_update`.

Input sends `project_id`, `table_type`, `payload`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | Yes | Property table type. |
| `--payload` | Yes | Capability payload JSON. |
