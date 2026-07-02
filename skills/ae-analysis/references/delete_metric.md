# analysis_meta +delete_metric (Delete Metric)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metric Management**

## Use Cases
- Permanently delete a metric by its ID.

## Commands
```bash
ae-cli analysis_meta +delete_metric --project_id <project_id> --metric_id <metric_id>
ae-cli analysis_meta +delete_metric --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--metric_id` | Yes | Metric ID to delete |

## Decision Rules
- Use `+list_metrics` first to confirm the metric ID before deleting.
- This is a destructive operation; keep the confirmation prompt unless automation is explicitly required.

## Recommended Chain
- `+list_metrics` -> `+delete_metric`
