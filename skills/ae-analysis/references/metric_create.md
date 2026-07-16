# analysis-meta metric create

Use when the user needs to create a metric from event or retention analysis configuration.

Do not use it to query metric values. Use this gateway command for an exact metric definition; use `analysis_meta +create_metric` only when the gateway capability is unavailable.

Command:

```bash
ae-cli analysis-meta metric create --project-id <project_id> --metric-name pay_amount --metric-desc 'Pay Amount' --metric-mode <mode> --metric-events '[...]' --metric-params '{}'
ae-cli analysis-meta metric create --project-id <project_id> --metric-name pay_amount --metric-desc 'Pay Amount' --metric-mode <mode> --metric-events '[...]' --dry-run
```

Capability id: `metadata.metric.create`.

Input sends typed snake_case fields. Common serializes `metric_events` and `metric_params` for the backend.

Output `data.metric` contains the created metric summary.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--metric-name` | Yes | Metric technical name. |
| `--metric-desc` | Yes | Metric display name. |
| `--metric-mode` | Yes | Metric model mode, for example `0` for event analysis. |
| `--metric-events` | Yes | Metric event-analysis QP JSON array. |
| `--metric-remark` | No | Metric remark. |
| `--metric-params` | No | Metric params JSON object; common defaults it to `{}` when needed. |
