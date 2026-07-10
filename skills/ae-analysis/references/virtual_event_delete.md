# analysis virtual-event delete

Use when the user needs to delete a virtual event rule.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis virtual-event delete --project-id <project_id> --v-event-id <v_event_id>
ae-cli analysis virtual-event delete --dry-run
```

Capability id: `metadata.virtual_event.delete`.

Input sends `project_id`, `v_event_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--v-event-id` | Yes | Virtual event ID. |
