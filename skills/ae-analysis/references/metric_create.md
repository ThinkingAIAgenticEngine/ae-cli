# analysis-meta metric create

Use when the user needs to create a metric from event or retention analysis configuration.

Do not use it to query metric values. Use this gateway command for an exact metric definition.

Command:

```bash
ae-cli analysis-meta metric create --project-id <project_id> --metric-name pay_amount --metric-desc 'Pay Amount' --model-type event --metric-events '[...]' --metric-params '{}'
ae-cli analysis-meta metric create --project-id <project_id> --metric-name retained_users --metric-desc 'Retained Users' --model-type retention --metric-events '[...]' --metric-params '{}'
ae-cli analysis-meta metric create --project-id <project_id> --metric-name pay_amount --metric-desc 'Pay Amount' --metric-mode 0 --metric-events '[...]' --dry-run
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
| `--model-type` | No | Semantic metric model type: `event` or `retention`. Prefer this over `--metric-mode`. |
| `--metric-mode` | No | Metric model mode, for example `0` for event analysis. Required only when `--model-type` is omitted. |
| `--metric-events` | Yes | Metric event-analysis QP JSON array. |
| `--metric-remark` | No | Metric remark. |
| `--metric-params` | No | Metric params JSON object; common defaults it to `{}` when needed. |

## Decision Rules

- Pass exactly one semantic model selector when possible: prefer `--model-type event` or `--model-type retention`.
- `--metric-mode` remains available for existing scripts; if both are provided, they must describe the same model.
- For event metrics, `--metric-params` is usually a format config such as `{"format":"integer"}`.
- For retention metrics, `--metric-params` should be the retention `eventView` configuration.
