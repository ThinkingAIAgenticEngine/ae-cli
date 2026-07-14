# analysis-meta virtual-property create

Use when the user needs to create a SQL virtual event or user property.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta virtual-property create --project-id <project_id> --payload '{}'
ae-cli analysis-meta virtual-property create --dry-run
```

Capability id: `metadata.virtual_property.create`.

Input sends `project_id`, `payload`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | Capability payload JSON. |
