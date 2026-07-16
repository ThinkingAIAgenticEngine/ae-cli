# analysis_meta +delete_metric (Delete Metric)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metric Management**

## Use Cases
- Permanently delete a metric by its ID.
- Do not use it when the metric should be retained with a corrected definition; use `+update_metric` instead.

## Output
Success confirms deletion of the specified metric. The command does not return a metric definition; verify absence with `+list_metrics`.

## Commands
```bash
ae-cli analysis_meta +delete_metric --project_id <project_id> --metric_id <metric_id> --dry-run
# Summarize the target and impact, then wait for explicit user confirmation.
ae-cli analysis_meta +delete_metric --project_id <project_id> --metric_id <metric_id> --yes
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--metric_id` | Yes | Metric ID to delete |

## Decision Rules
- Use `+list_metrics` first to confirm the metric ID before deleting.
- This is `high-risk-write`: inspect the dry-run, summarize the target and impact, and wait for explicit user confirmation before the `--yes` execution.

## Recommended Chain
- `+list_metrics` -> `+delete_metric`
