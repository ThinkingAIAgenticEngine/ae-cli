# Flow metric update

Use this reference when the user asks to configure, replace, or save effect metric settings for a flow canvas.

Mapped CLI command:

- `ae-cli engage-flow metric update`

Mapped capability:

- `engage-flow.metric.update`

## Safety

This is a write command. Only run it when the user explicitly asks to change a flow's metric configuration. Use `--dry-run` first when the final `metric_map` was assembled by an agent.

The backend uses a clean-and-insert update model: omitted existing metric settings may be deleted. Treat `metric_map` as the complete desired metric configuration for the flow, not a partial patch.

## Required input

- `--project-id`
- `--flow-id`
- `--metric-map '<metric_map_json>'`

## Parameter guidance

- `flow_id` is the logical flow ID used by the flow canvas APIs.
- `metric_map` is a JSON object keyed by metric target-user group. Valid first-level keys are exactly:
  - `trigger`
  - `view`
  - `click`
  - `ab_test`
- Preserve first-level group keys exactly. Do not convert `ab_test` to `abTest`.
- Each group value is an array of Hermes metric DTO objects.
- Use DTO field names from `HermesMetricReqDTO`: `metricSettingId`, `metricType`, `metricName`, `metricQp`, `metricWindowNum`, `metricWindowTimeUnit`, `timeCycleDef`, `displayName`, `orderId`, `note`, and `metricParams`.
- The CLI boundary accepts snake_case nested DTO fields too, but prefer the native camelCase names above in examples and generated payloads.
- For existing bindings, include `metricSettingId` so Hermes updates that binding instead of treating it as a new binding.
- For preset metrics, use `metricType: 1` and a real `metricName` discovered from `engage-setting common-metric list/get`.
- For custom metrics, use `metricType: 2` plus a complete `metricQp`, `metricWindowNum`, `metricWindowTimeUnit`, and `displayName`; Hermes creates the custom metric name.
- Do not invent metric names, event names, property names, QP structures, or metric-setting IDs. Read the existing flow detail and available metric definitions first, then update the complete desired metric map.

Create/save the flow first and obtain its logical `flow_id`, then configure effect metrics with this command. Do not put the global `metric_map` in the flow-save request.

## Custom metric window semantics

Choose the window from the user's intent, not from the number alone:

| User intent | `metricWindowNum` | `metricWindowTimeUnit` | `timeCycleDef` |
| --- | --- | --- | --- |
| One day / 24 hours / rolling one day | `1` | `"day"` | Omit |
| Until the end of the attribution event's calendar day | `1` | `"day"` | `{"startTime":"00:00"}` |
| Until the end of the attribution event's calendar week | `1` | `"week"` | `{"startDay":1,"startTime":"00:00"}` |
| Until the end of the attribution event's calendar month | `1` | `"month"` | `{"startDay":1}` |

`timeCycleDef` selects a natural calendar attribution window. The attribution event (such as a trigger, delivery, or click, according to the metric group) anchors the window; conversions must occur after that event and before the next configured cycle boundary. The boundary is exclusive. `1` + `day` alone remains a rolling one-day window. Resolve calendar boundaries in the flow's configured timezone (`tzOffset`), falling back to the backend default when absent. The report display timezone does not redefine the cycle.

For example, with Monday at midnight as the week boundary, a Wednesday 15:00 attribution event counts subsequent conversions before the following Monday 00:00. It does not count Monday or Tuesday conversions before that event. With midnight as the day boundary, a 23:00 attribution event has only the remainder of that day, rather than 24 hours.

Interpret "today", "this week", or "this month" as these windows only when the user means the attribution event's day, week, or month. A request to view results for the current reporting period belongs to report date filters and does not by itself authorize changing metric configuration.

Treat an unqualified "one day" as the existing rolling window. Use midnight, Monday, and the first day of the month for the calendar defaults above. Honor an explicitly requested valid cycle start. "Daily", "weekly", and "monthly" can describe task execution frequency: resolve the context and ask for clarification only when the metric window intent remains ambiguous.

Natural window constraints:

- `metricWindowNum` must be `1`; the unit must be `day`, `week`, or `month`.
- Day: require `startTime` in 24-hour `HH:mm`; omit `startDay`.
- Week: require `startDay` from `1` (Monday) to `7` (Sunday) and `startTime` in `HH:mm`.
- Month: require `startDay` from `1` to `28`; omit `startTime` or use `"00:00"`.
- An empty `timeCycleDef: {}` is invalid. Without `timeCycleDef`, only rolling `minute`, `hour`, and `day` units are accepted.
- When switching rolling to calendar, add the matching `timeCycleDef` and set the number/unit together. When switching back, remove `timeCycleDef` entirely and use a valid rolling unit. Preserve the binding's `metricSettingId` and all other desired metrics.
- These options apply to custom metrics (`metricType: 2`) through `metric update`. Do not use `engage-setting common-metric create/update` to create natural windows.
- Task support requires a backend deployment containing the task natural-window feature. Do not silently replace an unsupported calendar window with a rolling duration.

### Custom metric payload examples

Each JSON block is a complete illustrative `--metric-map` value for a configuration containing only that metric. The `purchase` event and QP below are examples, not discovered project metadata: substitute a verified project metric QP (as a JSON string) before use. For an existing configuration, merge the chosen metric into the complete current map and preserve existing binding IDs; do not submit these single-metric examples over other configured metrics.

Rolling one day:

```json
{
  "trigger": [
    {
      "metricType": 2,
      "metricQp": "{\"type\":0,\"eventName\":\"purchase\",\"analysis\":\"A100\",\"filts\":[]}",
      "metricWindowNum": 1,
      "metricWindowTimeUnit": "day",
      "displayName": "Purchase - Rolling one day",
      "orderId": 1
    }
  ]
}
```

Current calendar day:

```json
{
  "trigger": [
    {
      "metricType": 2,
      "metricQp": "{\"type\":0,\"eventName\":\"purchase\",\"analysis\":\"A100\",\"filts\":[]}",
      "metricWindowNum": 1,
      "metricWindowTimeUnit": "day",
      "displayName": "Purchase - Current calendar day",
      "orderId": 1,
      "timeCycleDef": {
        "startTime": "00:00"
      }
    }
  ]
}
```

Current calendar week:

```json
{
  "trigger": [
    {
      "metricType": 2,
      "metricQp": "{\"type\":0,\"eventName\":\"purchase\",\"analysis\":\"A100\",\"filts\":[]}",
      "metricWindowNum": 1,
      "metricWindowTimeUnit": "week",
      "displayName": "Purchase - Current calendar week",
      "orderId": 1,
      "timeCycleDef": {
        "startDay": 1,
        "startTime": "00:00"
      }
    }
  ]
}
```

Current calendar month:

```json
{
  "trigger": [
    {
      "metricType": 2,
      "metricQp": "{\"type\":0,\"eventName\":\"purchase\",\"analysis\":\"A100\",\"filts\":[]}",
      "metricWindowNum": 1,
      "metricWindowTimeUnit": "month",
      "displayName": "Purchase - Current calendar month",
      "orderId": 1,
      "timeCycleDef": {
        "startDay": 1
      }
    }
  ]
}
```

## Examples

Dry-run updating an existing binding:

```bash
ae-cli --dry-run engage-flow metric update \
  --project-id 1 \
  --flow-id flow_id_123 \
  --metric-map '{"trigger":[{"metricSettingId":"setting_1","metricType":1,"metricName":"purchase_count","displayName":"Purchase count","orderId":1}]}'
```

Apply the same update:

```bash
ae-cli engage-flow metric update \
  --project-id 1 \
  --flow-id flow_id_123 \
  --metric-map '{"trigger":[{"metricSettingId":"setting_1","metricType":1,"metricName":"purchase_count","displayName":"Purchase count","orderId":1}]}'
```

Add a custom metric to the `view` group:

```bash
ae-cli engage-flow metric update \
  --project-id 1 \
  --flow-id flow_id_123 \
  --metric-map '{"view":[{"metricType":2,"metricQp":"{\"type\":0,\"eventName\":\"purchase\",\"analysis\":\"A100\",\"filts\":[]}","metricWindowNum":1,"metricWindowTimeUnit":"day","displayName":"Purchase after view","orderId":1}]}'
```

## Common mistakes

- Do not pass `flow_uuid`; this command requires `flow_id`.
- Do not pass `metricId`; `HermesMetricReqDTO` has no `metricId` field. Use `metricSettingId` for an existing binding or `metricName` for a preset metric.
- Do not use arbitrary first-level keys such as `custom`, `ACTION`, or `channel`; use only `trigger`, `view`, `click`, or `ab_test`.
- Do not submit only the group you want to change unless deleting omitted groups is intended.
- Do not use this command to query report data. For report metric details, use `references/flow-metric-detail-report.md`.
