# analysis event list

Use when the user needs to list project super events.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis event list --project-id <project_id>
ae-cli analysis event list --dry-run
```

Capability id: `metadata.event.list`.

Input sends `project_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
