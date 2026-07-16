# analysis-meta event list

Use when the user needs to list project super events.

Do not use it for raw tracked events, event counts, or one full definition; it lists project super-event metadata.

Command:

```bash
ae-cli analysis-meta event list --project-id <project_id>
ae-cli analysis-meta event list --dry-run
```

Capability id: `metadata.event.list`.

Input sends `project_id`.

Output `data.events[]` contains project super-event metadata records.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
