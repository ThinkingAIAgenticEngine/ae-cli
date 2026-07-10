# analysis event get

Use when the user needs to get one super event metadata detail.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis event get --project-id <project_id> --event-name <event_name>
ae-cli analysis event get --dry-run
```

Capability id: `metadata.event.get`.

Input sends `project_id`, `event_name`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--event-name` | Yes | Event name. |
