# analysis event update

Use when the user needs to update event display names and remarks.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis event update --project-id <project_id> --event-name <event_name> --event-desc <event_desc> --remark <remark>
ae-cli analysis event update --dry-run
```

Capability id: `metadata.event.update`.

Input sends `project_id`, `event_name`, `event_desc`, `remark`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--event-name` | Yes | Event name. |
| `--event-desc` | No | Event display name. |
| `--remark` | No | Event remark. |
