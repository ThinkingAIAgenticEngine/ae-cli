# analysis-meta metric delete

Use when the user needs to delete a metric.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta metric delete --project-id <project_id> --metric-id <metric_id>
ae-cli analysis-meta metric delete --dry-run
```

Capability id: `metadata.metric.delete`.

Input sends `project_id`, `metric_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--metric-id` | Yes | Metric ID. |
