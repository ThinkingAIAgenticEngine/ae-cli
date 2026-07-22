# engage-setting common-metric

> Capability ids: `engage-setting.common-metric.{list,get,create,update,delete}` · Domain: `engage`.
> Auth: read uses `opsViewSetting` (list also allows `opsViewOperationTask`); write/delete use `opsEditSetting`.

## Commands

```bash
# List common metrics
ae-cli engage-setting common-metric list --project-id <project_id>

# Get a common metric detail
ae-cli engage-setting common-metric get --project-id <project_id> --metric-name <name>

# Create a PRESET common metric (metric-type must be 1)
ae-cli engage-setting common-metric create \
  --project-id <project_id> --metric-type 1 --metric-name <name> --metric-qp '<qp_json>' \
  --metric-window-num 1 --metric-window-time-unit day --display-name <display>

# Update a common metric
ae-cli engage-setting common-metric update \
  --project-id <project_id> --metric-type 1 --metric-name <name> --metric-qp '<qp_json>' \
  --metric-window-num <num> --metric-window-time-unit day --display-name <display>

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

### create / update

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--metric-type` | Yes | `1` = PRESET (common metric). **create requires `1`**. Do not use `2` (CUSTOM / task-side). |
| `--metric-name` | Yes | Technical name; prefer `^[a-z][0-9a-z_]{0,79}$`. |
| `--metric-qp` | Yes | Complete metric QP **JSON object string** (`type=0` event or `type=1` formula). |
| `--metric-window-num` | Yes | Window size (integer ≥ 1). |
| `--metric-window-time-unit` | Yes | `minute` / `hour` / `day` (lowercase). |
| `--display-name` | Yes | Display name. |
| `--note` | No | Remark. |
| `--order-id` | No | Sort order (usually omit on setting-page create). |
| `--metric-setting-id` | No | Binding id (task/config metricMap; usually omit on setting-page create). |
| `--metric-params` | No | Params JSON string; for formula metrics often `{"format":"float"}`. |

## Output

- `list`: `data.items` (each with `project_id`, `metric_type`, `metric_name`, `metric_qp`, `metric_window_num`, `metric_window_time_unit`, `note`, `last_editer`, `last_update_time`, `order_id`, `display_name`, `metric_setting_id`, `metric_params`) and `data.total`.
- `get`: `data.metric` — a single metric object with the same fields, or `null`.
- `create` / `update` / `delete`: `data.success`.

## Agent workflow (Pattern A: discover → match → assemble QP → write)

Unlike the Engage console (user picks events in a picker), Agents must discover real project metadata first. Never invent `event_name` / property names / `--metric-qp` placeholders such as `event`.

```bash
# 1) Discover candidate events (keyword: payment / recharge / purchase / ...)
ae-cli analysis-meta event list --project-id <project_id> --query <keyword> \
  --fields '["event_name","event_desc","authentication_status"]' --limit 20

# Optional soft hint: project recharge-success event name
ae-cli engage-setting preset-event list --project-id <project_id>
# → data.recharge_event_desc may contain eventName (not a ready metric_qp)

# 2) If filters are needed, list properties for the matched event
ae-cli analysis-meta property list --project-id <project_id> \
  --scope event --event-name <matched_event_name>

# 3) Assemble a type=0 metric QP object from the matched event, then create
ae-cli engage-setting common-metric create --project-id <project_id> \
  --metric-type 1 --metric-name <name> --metric-qp '<qp_json>' \
  --metric-window-num 1 --metric-window-time-unit day --display-name <display>
```

If multiple events remain plausible after discovery, stop and ask the user which `event_name` to use.

## `--metric-qp` example (type=0 event analysis)

Pass as a single JSON **object string**. Minimal shape aligned with the Engage setting-page event metric:

```json
{
  "type": 0,
  "eventName": "purchase",
  "eventDesc": "Purchase",
  "eventType": "event",
  "analysis": "A100",
  "analysisDesc": "Total count",
  "analysisParams": "",
  "quota": "",
  "quotaDesc": "",
  "filts": [],
  "relation": 1,
  "customEvent": "",
  "customFilters": [],
  "eventNameDisplay": "Purchase total count",
  "subTableType": "",
  "taPropQuota": {
    "analysis": "A100",
    "analysisDesc": "Total count",
    "analysisParams": "",
    "quota": "",
    "quotaDesc": ""
  }
}
```

CLI rejects non-JSON, non-object, and `{}` values before the request is sent.

## Preflight for config-metric batch-add

`engage-scene config-metric batch-add --ta-metric-ids` requires TA common metrics to exist in the project. List them first:

```bash
ae-cli engage-setting common-metric list --project-id <project_id>
```

If `items` is empty, create PRESET metrics with `common-metric create` (Pattern A above) or treat the case as environment-blocked.

## Decision Rules

- Use these commands when the user asks to manage common metrics for the analysis workbench.
- Discover existing metric names with `common-metric list` first; never invent names for `get`/`update`/`delete`.
- For create/update, discover events/properties via `ae-analysis` (`analysis-meta event list` / `property list`) before assembling `--metric-qp`.
- `--metric-type` for setting-page common metrics is always `1` (PRESET). create rejects any other value.
- `--metric-window-time-unit` must be lowercase `minute` / `hour` / `day` (not `DAY`).
- `--metric-qp` must be a complete metric QP JSON object; do not pass `{}` or placeholder strings.
- `delete` is `high-risk-write` and requires `--yes` (or interactive confirmation).
