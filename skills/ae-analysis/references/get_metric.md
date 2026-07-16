# analysis_meta +get_metric (View Metric Details)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Constraints

**Not an ad-hoc pre-step:** Do not call `+get_metric` just to expand a saved metric before normal ad-hoc analysis. If the user asks to query a saved metric, pass the metric display/name/remark directly in `analysis adhoc run --definition`; the backend compiler resolves saved metrics internally.

## Use Cases
- Get the definition details of a single metric. Returns the metric name, display name, remark, model type, linked events, and parameter definition without executing metric calculation.
- Use this command for metric metadata inspection, metric editing, auditing, or when the user explicitly asks for metric definition details. Do not use it merely to expand a saved metric before an ad-hoc query.

## Commands
```bash
ae-cli analysis_meta +get_metric --project_id <project_id> --metric_id 1
ae-cli analysis_meta +get_metric --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--metric_id` / `-m` | Yes | Metric ID |

## Decision Rules
- For the first run, pass only the required parameters (`--project_id` and `--metric_id`) to confirm the path works, then add optional parameters.
- For ad-hoc analysis, do not read metric details first. Call `analysis adhoc run` or `analysis adhoc export` with the user's metric/event/property wording.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id` and `--metric_id`).
- If reading fails, first verify that the object ID exists and belongs to the current project.

## Recommended Chaining
- +get_metric -> +update_metric
- For ad-hoc saved metric query: analysis adhoc run/export
