# analysis virtual-event create

Use when the user needs to create a virtual event from events and filters.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis virtual-event create --project-id <project_id> --override true --payload '{}'
ae-cli analysis virtual-event create --dry-run
```

Capability id: `metadata.virtual_event.create`.

Input sends `project_id`, `override`, `payload`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--override` | No | Whether to override an existing virtual event rule. |
| `--payload` | Yes | Capability payload JSON. |
