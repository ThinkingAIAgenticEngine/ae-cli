# analysis-meta event hide-update

Use when the user needs to batch hide or show events.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta event hide-update --project-id <project_id> --event-names '{}' --is-hide true
ae-cli analysis-meta event hide-update --dry-run
```

Capability id: `metadata.event.hide_update`.

Input sends `project_id`, `event_names`, `is_hide`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--event-names` | Yes | Event names JSON array, or a JSON string accepted by common-service. |
| `--is-hide` | Yes | Whether to hide the events. |
