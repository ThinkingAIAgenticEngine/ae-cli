# te_meta +list_metrics (Metric Search)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Query**

## Use Cases
- List metric metadata in the project. Supports keyword filtering and returns metric IDs, names, display names, model types, remarks, and related metadata, but not metric calculation results.
- List metric metadata in the project.

## Command
```bash
ae-cli te_meta +list_metrics --project_id 1
ae-cli te_meta +list_metrics --project_id 1 --query demo
ae-cli te_meta +list_metrics --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against metric names, display names, and remarks; if omitted, all metrics are returned. |

## Decision Rules
- First run should only pass the required parameter (`--project_id`), and add optional parameters only after the path is confirmed to work.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If the required parameter is missing, fall back to the smallest runnable command and fill it in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +list_metrics -> +create_metric -> +get_metric
