# Common metric semantic definitions

> Trigger keywords: common metric, shared metric · Capability ids: `engage-setting.common-metric.{list,get,create,update,delete}` · Permission: `opsEditSetting`.

Common metric capabilities expose semantic event/formula definitions. Do not submit or reuse `metric_qp`, `Axxx`, display metadata, formula dependency internals, or property metadata.
Metric definitions and formula dependencies reject unknown fields. Event filter `field` accepts
either a technical-name string or `{"name":"...","type":"event_property"}`.

When metadata reports an event property as `array_row`, express it as an `object_group` filter
with `any_satisfy`, `none_satisfy`, or `all_satisfy`; its nested `conditions.items` may reference
only child properties of that parent. Flat filters on the `array_row` parent are rejected before
the metric is saved.

## Commands

```bash
ae-cli engage-setting common-metric list --project-id <project_id>
ae-cli engage-setting common-metric get --project-id <project_id> --metric-name <name>
ae-cli engage-setting common-metric create --project-id <project_id> --metric-type 1 \
  --metric-name <name> --metric-definition '<json>' \
  --metric-window-num 1 --metric-window-time-unit day --display-name <display_name>
ae-cli engage-setting common-metric update --project-id <project_id> --metric-type 1 \
  --metric-name <name> --metric-definition '<json>' \
  --metric-window-num 1 --metric-window-time-unit day --display-name <display_name>
ae-cli engage-setting common-metric delete --project-id <project_id> --metric-name <name> --yes
```

## Event metric

```json
{
  "type": "event",
  "event": "purchase",
  "aggregation": "sum",
  "property": "amount",
  "filters": {
    "relation": "and",
    "items": [
      {
        "field": "currency",
        "operator": "eq",
        "values": ["USD"]
      }
    ]
  }
}
```

Object-group filter example:

```json
{
  "type": "object_group",
  "field": "items",
  "operator": "any_satisfy",
  "conditions": {
    "relation": "and",
    "items": [
      {
        "field": "items.quantity",
        "operator": "gte",
        "values": [10]
      }
    ]
  }
}
```

Supported aggregations include `total_count`, `user_count`, `per_user_count`, `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `median`, `percentile`, `variance`, and `stddev`.

Property aggregations require `property`. `percentile` additionally requires a numeric
`percentile` greater than `0` and at most `100`:

```json
{
  "type": "event",
  "event": "purchase",
  "aggregation": "percentile",
  "property": "amount",
  "percentile": 90
}
```

## Formula metric

```json
{
  "type": "formula",
  "expression": "purchases/refunds",
  "format": "percent",
  "dependencies": [
    {
      "type": "event",
      "key": "purchases",
      "event": "purchase",
      "aggregation": "total_count"
    },
    {
      "type": "event",
      "key": "refunds",
      "event": "refund",
      "aggregation": "total_count"
    }
  ]
}
```

Every dependency requires a non-empty, unique `key`, and every key must be used in
`expression`. Write bare keys only: use `purchases/refunds`, never `purchases.A100/refunds.A100`.
Aggregation codes are derived from each dependency. Formula dependencies follow the same
property and percentile requirements as event metrics.

Resolve every event and property through `ae-cli analysis-meta event list` and the corresponding property metadata before writing. `get` and `list` return `metric_definition`, `metric_definition_status`, and an optional unavailable reason. Raw metric QP is hidden.

## Rolling and natural windows

`metric_type=1` remains required for setting-page common metrics. Window configuration is
separate from `metric_definition` and applies to both event and formula metrics.

- Rolling windows use `minute`, `hour`, or `day`. On create, omit `--time-cycle-def`
  (or pass `null`) to keep the rolling behavior. A rolling day is not a calendar day.
- Natural windows use `day`, `week`, or `month` with `--metric-window-num 1` and a
  non-null `--time-cycle-def` object. The capability input key is `time_cycle_def`;
  its public nested keys are `start_time` / `start_day` (snake_case).

| Window | Unit | `--time-cycle-def` |
| --- | --- | --- |
| Calendar day | `day` | '{"start_time":"00:00"}' |
| Calendar week (Monday) | `week` | '{"start_day":1,"start_time":"00:00"}' |
| Calendar month | `month` | '{"start_day":1}' |
| Day starting at 06:30 | `day` | '{"start_time":"06:30"}' |
| Week starting Wednesday at 06:30 | `week` | '{"start_day":3,"start_time":"06:30"}' |
| Month starting on day 15 | `month` | '{"start_day":15}' |

Day/week `start_time` must use `HH:mm` (00:00-23:59). A day must omit `start_day`.
Week `start_day` is 1-7 (Monday-Sunday); month `start_day` is 1-28. A month must
omit `start_time` or set it to `00:00`. Unknown keys and invalid combinations are rejected.

For an existing verified event, add these flags to `common-metric create`:

```bash
--metric-window-num 1 --metric-window-time-unit week \
  --time-cycle-def '{"start_day":1,"start_time":"00:00"}'
```

On **update**, omitting `--time-cycle-def` preserves the stored definition. The server
validates the new window parameters together with that definition; omission must not
silently turn a calendar day into a rolling day. Pass a new object to change the cycle,
or explicitly pass `--time-cycle-def null` and a rolling unit to clear it. For example,
switching to a rolling day uses:

```bash
--metric-window-num 1 --metric-window-time-unit day --time-cycle-def null
```

`get` and `list` return `time_cycle_def` (an object, or `null` for rolling windows).
After create/update, read the metric back and check that the definition matches the intent.
When binding a PRESET metric to a task or flow, reference its verified metric name using
the documented metric-update contract; the saved common metric provides the window.
Hermes with natural common-metric capability support must be deployed before using the
new flags. Older Hermes versions may reject `time_cycle_def` or week/month units.
