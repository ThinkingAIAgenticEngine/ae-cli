# analysis-meta metric update

Use when the user needs to update metric definition, name, and remark.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta metric update --project-id <project_id> --payload '{}'
ae-cli analysis-meta metric update --dry-run
```

Capability id: `metadata.metric.update`.

Input sends `project_id`, `payload`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | Capability payload JSON. |
