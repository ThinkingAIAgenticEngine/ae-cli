# analysis-meta metric list

Use when the user needs to list project metrics.

Do not use it to calculate metric values; use report/dashboard/ad-hoc data routing for result queries.

Command:

```bash
ae-cli analysis-meta metric list --project-id <project_id> --ignore-authentication true
ae-cli analysis-meta metric list --dry-run
```

Capability id: `metadata.metric.list`.

Input sends `project_id`, `ignore_authentication`.

Output `data.metrics[]` contains project metric summaries and authentication decoration unless explicitly skipped.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--ignore-authentication` | No | Whether to skip asset authentication status decoration. |
