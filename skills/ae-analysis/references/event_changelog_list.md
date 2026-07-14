# analysis-meta event changelog-list

Use when the user needs to list event metadata change logs.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta event changelog-list --project-id <project_id> --event-name <event_name>
ae-cli analysis-meta event changelog-list --dry-run
```

Capability id: `metadata.event.changelog_list`.

Input sends `project_id`, `event_name`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--event-name` | Yes | Event name. |
