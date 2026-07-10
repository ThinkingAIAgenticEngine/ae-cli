# analysis property hide-update

Use when the user needs to batch hide or show properties.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis property hide-update --project-id <project_id> --table-type <table_type> --prop-names '{}' --is-hide true
ae-cli analysis property hide-update --dry-run
```

Capability id: `metadata.property.hide_update`.

Input sends `project_id`, `table_type`, `prop_names`, `is_hide`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | Yes | Property table type. |
| `--prop-names` | Yes | Property names JSON array, or a JSON string accepted by common-service. |
| `--is-hide` | Yes | Whether to hide the properties. |
