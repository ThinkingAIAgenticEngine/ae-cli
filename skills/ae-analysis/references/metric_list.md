# analysis-meta metric list

Use when the user needs to list project metrics.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta metric list --project-id <project_id> --ignore-authentication true
ae-cli analysis-meta metric list --dry-run
```

Capability id: `metadata.metric.list`.

Input sends `project_id`, `ignore_authentication`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--ignore-authentication` | No | Whether to skip asset authentication status decoration. |
