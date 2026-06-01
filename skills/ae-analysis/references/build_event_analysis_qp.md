# analysis +build_event_analysis_qp (build event analysis qp)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated event-analysis QP from structured intent.
- Use in the mandatory builder flow before `+query_adhoc --model_type event`.
- This command builds QP only and does not execute the analysis query.
- This is one of exactly four QP builders: `event`, `retention`, `funnel`, `prop_analysis`.
- Use this builder for event-analysis ad hoc requests; do not manually build event QP through `+get_analysis_query_schema`.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase DTO names.
- Correct nested keys: `startTime`, `endTime`, `timeRange`, `timeParticleSize`.
- Wrong nested keys: `start_date`, `start_time`, `startDate` inside examples copied from other APIs.
- Wrap JSON in single quotes in shell commands.
- Do not run syntax examples with placeholder JSON. Fill `time_range` and `metrics` with valid nested fields before calling this command.
- `--dry-run` still requires the same required flags as a real builder call. Never run this command as dry-run without `--project_id`, `--time_range`, and `--metrics`.
- Do not call `get_analysis_query_schema`, `list_events`, `list_properties`, `list_metrics`, or `get_metric` before this builder for normal ad-hoc analysis. The builder resolves events, properties, and saved metric names internally.
- Builder commands do not accept `zone_offset`; pass `--zone_offset` to `+query_adhoc` after the builder succeeds.
- If the request misses `time_range` or `metrics`, stop and ask the user to clarify.

## Command Syntax
```bash
ae-cli analysis +build_event_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --metrics '<valid_metrics_json_array>'
ae-cli analysis +build_event_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --metrics '<valid_metrics_json_array>' --time_particle_size day --groups '<valid_groups_json_array>' --filters '<valid_filters_json_array>' --relation and
ae-cli analysis +build_event_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --metrics '<valid_metrics_json_array>' --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--time_range` | Yes | Event analysis time range JSON |
| `--metrics` | Yes | Event metrics JSON array |
| `--time_particle_size` | No | Time granularity. Default: total |
| `--groups` | No | Group-by dimensions JSON array |
| `--filters` | No | Global filters JSON array |
| `--relation` | No | Filter relation. Supported values: and, or. Default: and |

## JSON Shape
`--time_range` object:
```json
{"mode":"start_to_yesterday","startTime":"2021-05-18"}
```

Time range fields:
| Field | Required | Description |
|---|---|---|
| `mode` | Yes | `recent`, `previous`, `custom`, `start_to_today`, `start_to_yesterday` |
| `unit` | For `recent`/`previous` | `day`, `week`, `month`, `quarter`, `year` |
| `value` | For `recent`/`previous` | Unit count. `{"mode":"previous","unit":"day","value":1}` means yesterday. |
| `startTime` | For `custom`/`start_to_*` | `yyyy-MM-dd` or `yyyy-MM-dd HH:mm:ss` |
| `endTime` | For `custom` only | `yyyy-MM-dd` or `yyyy-MM-dd HH:mm:ss` |

`--metrics` array:
```json
[{"event":"special_data","aggregation":"user_count"}]
```

Metric fields:
| Field | Required | Description |
|---|---|---|
| `event` | Yes for regular metrics | Event display name, technical name, or remark |
| `aggregation` | Yes for regular metrics | `total_count`, `user_count`, `per_user_count`, `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `true_count`, `false_count`, `not_empty_count`, `empty_count`, `median`, `percentile`, `variance`, `stddev` |
| `property` | Required for property aggregations | Required except for `total_count`, `user_count`, and `per_user_count` |
| `percentile` | Required for `percentile` | Number such as `90` |
| `filters` | No | Metric-level `FilterRequest[]` |
| `relation` | No | Relation between metric filters: `and` or `or` |
| `formula` | For formula metrics | Formula expression. Omit `aggregation` when using formula. |
| `dependencies` | For formula metrics | Formula dependency array |

Saved metric reference:
- Event analysis builder can resolve a saved metric by name/display name/remark through the metric target field.
- If the user asks to query an existing metric such as "战斗失败率" or gives a metric identifier/name that should be used as a saved metric, pass it as `{"event":"战斗失败率"}` and omit `aggregation`, `property`, `formula`, and `dependencies`.
- Do not call `list_metrics` or `get_metric` first only to expand that saved metric. If the builder cannot resolve it, it will return `need_clarification` with candidates.

Formula dependency object:
```json
{"alias":"starts","event":"battle_start","aggregation":"total_count"}
```

`--groups` array:
```json
[{"field":{"name":"账户ID","type":"event_property"}}]
```

`--filters` array:
```json
[{"field":{"name":"账户ID","type":"event_property"},"operator":"exists"}]
```

Filter fields:
| Field | Required | Description |
|---|---|---|
| `field.name` | Yes | Field display name, technical name, or remark |
| `field.type` | Recommended | `event_property`, `user_property`, `cluster`, `tag`; omit only when metadata is unambiguous |
| `operator` | Yes | `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `exists`, `not_exists`, `between`, `contains`, `not_contains`, `is_true`, `is_false`, `regex`, `not_regex`, `in_cluster`, `not_in_cluster` |
| `values` | Depends | Omit for `exists`/`not_exists`/`is_true`/`is_false`; exactly two values for `between`; non-empty array for other value operators |

## Examples
Minimal event user count:
```bash
ae-cli analysis +build_event_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":1}' --metrics '[{"event":"special_data","aggregation":"user_count"}]'
```

Formula metric example:
```bash
ae-cli analysis +build_event_analysis_qp --project_id 3137 --time_range '{"mode":"start_to_yesterday","startTime":"2021-05-20"}' --metrics '[{"formula":"battle_lost.A100 / battle_start.A100","dependencies":[{"alias":"battle_lost","event":"battle_lose_rate","aggregation":"total_count"},{"alias":"battle_start","event":"battle_start","aggregation":"total_count"}]}]'
```

Saved metric by name:
```bash
ae-cli analysis +build_event_analysis_qp --project_id 3137 --time_range '{"mode":"custom","startTime":"2021-05-20","endTime":"2026-05-26"}' --metrics '[{"event":"战斗失败率"}]'
```

Global OR filters and event-property group:
```bash
ae-cli analysis +build_event_analysis_qp --project_id 3137 --time_range '{"mode":"start_to_yesterday","startTime":"2021-05-18"}' --metrics '[{"event":"special_data","aggregation":"user_count"}]' --filters '[{"field":{"name":"账户ID","type":"event_property"},"operator":"exists"},{"field":{"name":"城市","type":"event_property"},"operator":"exists"}]' --relation or --groups '[{"field":{"name":"账户ID","type":"event_property"}}]'
```

## Decision Rules
- After successful build, call `+query_adhoc --model_type event --qp '<response.qp>'`.
- If build returns non-generated status, stop and ask user to clarify; do not call `+query_adhoc`.
- Wrap JSON parameters in single quotes to avoid shell escaping issues.
- Do not pre-query metrics or metadata. If the user provides a metric name, event name, property name, or formula, pass that structured intent to the builder and let it resolve.
- If the user gave a time zone, keep it for `+query_adhoc --zone_offset`; do not put it in the builder JSON.

## Recommended Chaining
- `+build_event_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type event --qp '<response.qp>'`
