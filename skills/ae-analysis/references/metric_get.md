# analysis metric get

Use when the user needs to get metric definition, events, and params.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis metric get --project-id <project_id> --metric-id <metric_id>
ae-cli analysis metric get --dry-run
```

Capability id: `metadata.metric.get`.

Input sends `project_id`, `metric_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--metric-id` | Yes | Metric ID. |
