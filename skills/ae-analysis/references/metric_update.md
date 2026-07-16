# analysis-meta metric update

Use when the user needs to update metric definition, name, and remark.

Do not use it to query metric values. Use `analysis_meta +update_metric` only when the gateway capability is unavailable.

Command:

```bash
ae-cli analysis-meta metric update --project-id <project_id> --metric-id <metric_id> --metric-desc 'New display name' --metric-remark 'New remark'
ae-cli analysis-meta metric update --project-id <project_id> --metric-id <metric_id> --metric-desc 'New display name' --dry-run
```

Capability id: `metadata.metric.update`.

Input sends typed snake_case fields.

Output `data.metric` contains the updated summary for a full-definition update containing `metric_events`. A display-name/remark-only edit succeeds without business data.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--metric-id` | Yes | Metric ID. |
| `--metric-name` | No | Metric technical name for a full-definition update. |
| `--metric-desc` | No | Metric display name. |
| `--metric-remark` | No | Metric remark. |
| `--metric-mode` | No | Metric model mode for a full-definition update. |
| `--metric-events` | No | Metric event-analysis QP JSON array for a full-definition update. |
| `--metric-params` | No | Metric params JSON object. |
