# analysis event influence-list

Use when the user needs to list assets affected by event delete, hide, or update.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis event influence-list --project-id <project_id> --event-name <event_name>
ae-cli analysis event influence-list --dry-run
```

Capability id: `metadata.event.influence_list`.

Input sends `project_id`, `event_name`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--event-name` | Yes | Event name. |
