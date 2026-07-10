# analysis event delete

Use when the user needs to batch delete events or virtual events.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis event delete --project-id <project_id> --event-names '{}'
ae-cli analysis event delete --dry-run
```

Capability id: `metadata.event.delete`.

Input sends `project_id`, `event_names`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--event-names` | Yes | Event names JSON array, or a JSON string accepted by common-service. |
