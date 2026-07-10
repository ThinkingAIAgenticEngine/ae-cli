# analysis property related-events

Use when the user needs to list events related to one event property.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis property related-events --project-id <project_id> --prop-name <prop_name>
ae-cli analysis property related-events --dry-run
```

Capability id: `metadata.property.related_events`.

Input sends `project_id`, `prop_name`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--prop-name` | Yes | Event property column name. |
