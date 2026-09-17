# Task metric update

Use this reference to configure, add, or replace effect metric settings for an operation task.

Mapped CLI command: `ae-cli engage-task metric update`

Mapped capability: `engage-task.metric.update`

## Required input

- `--project-id`
- `--task-id`
- `--metric-map '<metric_map_json>'`

## Workflow and parameter guidance

1. Create/save the task first and obtain its `task_id`. The task-save request does not configure global effect metrics through `metricMap`.
2. Read task details with `ae-cli engage-task task get --project-id <project_id> --task-id <task_id>` and use the grouped `metric_map` as the update baseline. `metric list` returns a flat list without group membership, so it cannot reconstruct this map. If the grouped configuration is unavailable, do not guess groups or treat the flat list as an empty configuration.
3. Build the complete desired `metric_map`. This is a clean-and-insert update: omitted settings may be deleted, so preserve each binding's original group, all other desired metrics, and existing `metricSettingId` values. Select the binding to change by its setting ID, not by its display name.
4. Use `--dry-run` on the assembled request before applying the explicitly requested configuration change. After applying, read task details again and compare the groups, binding IDs, and window fields with the intended configuration.

`metric_map` is an object with target-user group keys `trigger`, `view`, and `click`, each containing an array of Hermes metric DTOs. Use native camelCase DTO fields: `metricSettingId`, `metricType`, `metricName`, `metricQp`, `metricWindowNum`, `metricWindowTimeUnit`, `timeCycleDef`, `displayName`, `orderId`, `note`, and `metricParams`. Nested snake_case fields are also accepted at the CLI boundary.

For a custom metric use `metricType: 2`, a complete verified `metricQp` JSON string, the window fields, `displayName`, and `orderId`; Hermes creates the custom metric name. For preset metrics use `metricType: 1` and a real `metricName` from `engage-setting common-metric list/get`. Do not invent event names, metric names, QP structures, or binding IDs. Both custom and preset bindings require `displayName` and `orderId`. Do not use `metricId` in place of `metricSettingId`.

```bash
ae-cli --dry-run engage-task metric update \
  --project-id <project_id> \
  --task-id <task_id> \
  --metric-map '<complete_metric_map_json>'
```

Replace the placeholders with discovered IDs and the complete desired JSON map. Apply the same command without `--dry-run` only for an authorized configuration change.

## Custom metric window semantics

Choose the window from the user's intent, not from the number alone:

| User intent | `metricWindowNum` | `metricWindowTimeUnit` | `timeCycleDef` |
| --- | --- | --- | --- |
| One day / 24 hours / rolling one day | `1` | `"day"` | Omit |
| Until the end of the attribution event's calendar day | `1` | `"day"` | `{"startTime":"00:00"}` |
| Until the end of the attribution event's calendar week | `1` | `"week"` | `{"startDay":1,"startTime":"00:00"}` |
| Until the end of the attribution event's calendar month | `1` | `"month"` | `{"startDay":1}` |

`timeCycleDef` selects a natural calendar attribution window. The attribution event (such as a trigger, delivery, or click, according to the metric group) anchors the window; conversions must occur after that event and before the next configured cycle boundary. The boundary is exclusive. `1` + `day` alone remains a rolling one-day window. Resolve calendar boundaries in the task's configured timezone (`tzOffset`), falling back to the backend default when absent. The report display timezone does not redefine the cycle.

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

## Related interfaces

- [Task save](save-task.md): create or update the task draft before configuring effect metrics.
- [Flow metric update](flow-metric-update.md): the equivalent flow canvas configuration.
- [Task metric detail](task-metric-detail.md): query metric reports; this is separate from configuration.
