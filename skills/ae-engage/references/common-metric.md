# engage-setting common-metric

> Capability ids: `engage-setting.common-metric.{list,get,update,delete}` · Domain: `engage`. (`create` temporarily disabled in CLI.)

## Commands

```bash
# List common metrics
ae-cli engage-setting common-metric list --project-id <project_id>

# Get a common metric detail
ae-cli engage-setting common-metric get --project-id <project_id> --metric-name <name>

# Update a common metric
ae-cli engage-setting common-metric update \
  --project-id <project_id> --metric-type <type> --metric-name <name> --metric-qp <qp> \
  --metric-window-num <num> --metric-window-time-unit DAY --display-name <display>

# Delete a common metric (high-risk)
ae-cli engage-setting common-metric delete --project-id <project_id> --metric-name <name> --yes
```

## Parameters

### list

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |

### get / delete

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--metric-name` | Yes | Metric name. |

### update

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--metric-type` | Yes | Metric type (see MetricTypeEunm). |
| `--metric-name` | Yes | Metric name. |
| `--metric-qp` | Yes | Metric qp (event/property expression). |
| `--metric-window-num` | Yes | Metric window number. |
| `--metric-window-time-unit` | Yes | Metric window time unit (MINUTE/HOUR/DAY). |
| `--display-name` | Yes | Display name of the metric. |
| `--note` | No | Metric note/remark. |
| `--order-id` | No | Sort order id. |
| `--metric-setting-id` | No | Metric setting id (when binding to a setting). |
| `--metric-params` | No | Metric params JSON string. |

## Output

- `list`: `data.items` (each with `project_id`, `metric_type`, `metric_name`, `metric_qp`, `metric_window_num`, `metric_window_time_unit`, `note`, `last_editer`, `last_update_time`, `order_id`, `display_name`, `metric_setting_id`, `metric_params`) and `data.total`.
- `get`: `data.metric` — a single metric object with the same fields, or `null`.
- `update` / `delete`: `data.success`.

## Preflight for config-metric batch-add

`engage-scene config-metric batch-add --ta-metric-ids` requires TA common metrics to exist in the project. List them first:

```bash
ae-cli engage-setting common-metric list --project-id <project_id>
```

If `items` is empty, common metrics must be created in the Engage console before binding them to a config item, or treat the case as environment-blocked.

## Decision Rules

- Use these commands when the user asks to manage common metrics (常用指标) for the analysis workbench.
- Discover existing metric names with `common-metric list` first; never invent names for `get`/`update`/`delete`.
- `--metric-qp` must be a complete metric QP expression; do not pass `{}` as a placeholder.
- `delete` is `high-risk-write` and requires `--yes` (or interactive confirmation).
