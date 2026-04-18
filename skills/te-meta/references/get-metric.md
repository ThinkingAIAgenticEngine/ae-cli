# te_meta +get_metric (View Metric Details)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Query**

## Use Cases
- Get the definition details of a single metric. Returns the metric name, display name, remark, model type, linked events, and parameter definition without executing metric calculation.
- Get the definition details of a single metric.

## Commands
```bash
te-cli te_meta +get_metric --project_id 1 --metric_id 1
te-cli te_meta +get_metric --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--metric_id` / `-m` | Yes | Metric ID |

## Decision Rules
- For the first run, pass only the required parameters (`--project_id` and `--metric_id`) to confirm the path works, then add optional parameters.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id` and `--metric_id`).
- If reading fails, first verify that the object ID exists and belongs to the current project.

## Recommended Chaining
- +get_metric -> +update_metric
