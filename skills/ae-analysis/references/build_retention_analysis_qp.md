# analysis +build_retention_analysis_qp (build retention analysis qp)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated retention-analysis QP from structured intent.
- Use in the mandatory builder flow before `+query_adhoc --model_type retention`.
- This command builds QP only and does not execute the analysis query.
- This is one of exactly four QP builders: `event`, `retention`, `funnel`, `prop_analysis`.
- Use this builder for retention ad hoc requests; do not manually build retention QP through `+get_analysis_query_schema`.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase DTO names.
- Correct nested keys: `initialEvent`, `returnEvent`, `unitNum`, `rtnRateOrNum`, `relationEventPropertyName`, `initialFilters`, `returnFilters`, `initialFilterRelation`, `returnFilterRelation`.
- Initial/return event filters are event-property-only and use `eventPropertyName`; they do not use the generic `field` object.
- Retention global filters and groups use the generic `field` object.
- Do not run syntax examples with placeholder JSON. Fill `time_range` and `retention` with valid nested fields before calling this command.
- `--dry-run` still requires the same required flags as a real builder call. Never run this command as dry-run without `--project_id`, `--time_range`, and `--retention`.
- Do not call `get_analysis_query_schema`, `list_events`, `list_properties`, `list_metrics`, or `get_metric` before this builder for normal ad-hoc analysis. The builder resolves events and properties internally.
- Builder commands do not accept `zone_offset`; pass `--zone_offset` to `+query_adhoc` after the builder succeeds.
- If the request misses time range, initial event, return event, or retention interval, stop and ask the user to clarify.

## Command Syntax
```bash
ae-cli analysis +build_retention_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --retention '<valid_retention_json>'
ae-cli analysis +build_retention_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --retention '<valid_retention_json>' --relation and --time_particle_size day
ae-cli analysis +build_retention_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --retention '<valid_retention_json>' --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--authenticated_only` | No | Resolve only authenticated assets while building the QP. Do not pass this flag to `+query_adhoc`. |
| `--time_range` | Yes | Retention analysis time range JSON |
| `--retention` | Yes | Retention intent JSON |
| `--relation` | No | Top-level retention filter relation. Supported values: and, or. Default: and |
| `--time_particle_size` | No | Time granularity. Supported values: day, week, month |

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

`--retention` object:
```json
{
  "initialEvent":"注册",
  "returnEvent":"商品购买",
  "unitNum":7,
  "statType":"retention",
  "rtnRateOrNum":"R0",
  "relationEventPropertyName":"账户ID",
  "initialFilters":[{"eventPropertyName":"账户ID","operator":"exists"}],
  "returnFilters":[{"eventPropertyName":"账户ID","operator":"exists"}],
  "filters":[{"field":{"name":"城市","type":"event_property"},"operator":"exists"}],
  "groups":[{"field":{"name":"渠道","type":"user_property"}}]
}
```

Retention fields:
| Field | Required | Description |
|---|---|---|
| `initialEvent` | Yes | Initial event display name, technical name, or remark |
| `returnEvent` | Yes | Return event display name, technical name, or remark |
| `unitNum` | Yes | Retention interval count, such as `1` for day-1 or `7` for day-7 |
| `statType` | No | `retention` for retained users or `lost` for lost users |
| `rtnRateOrNum` | No | `R0`, `rate`, or `retention` for rate; `R1`, `number`, or `count` for user count. Default: `R0`. |
| `relationEventPropertyName` | No | Event property shared by initial event, return event, and simultaneous metrics |
| `simultaneousMetrics` | No | Extra retention display metrics |
| `groups` | No | Generic group-by dimensions |
| `filters` | No | Generic retention filters |
| `initialFilters` | No | Event-property-only filters for initial event |
| `initialFilterRelation` | No | Relation for `initialFilters`: `and` or `or` |
| `returnFilters` | No | Event-property-only filters for return event |
| `returnFilterRelation` | No | Relation for `returnFilters`: `and` or `or` |

Initial/return event filter object:
```json
{"eventPropertyName":"账户ID","operator":"exists"}
```

Generic filter object for `retention.filters`:
```json
{"field":{"name":"城市","type":"event_property"},"operator":"exists"}
```

Group object:
```json
{"field":{"name":"渠道","type":"user_property"}}
```

Metric object for `simultaneousMetrics`:
```json
{"event":"商品购买","aggregation":"user_count"}
```

Supported aggregations:
`total_count`, `user_count`, `per_user_count`, `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `true_count`, `false_count`, `not_empty_count`, `empty_count`, `median`, `percentile`, `variance`, `stddev`.

Filter operator rules:
| Operator | Values |
|---|---|
| `exists`, `not_exists`, `is_true`, `is_false` | Omit `values` |
| `between` | Exactly two values |
| `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`, `not_contains`, `regex`, `not_regex` | Non-empty `values` array |
| `in_cluster`, `not_in_cluster` | Cluster operator; values are not required by builder validation |

## Examples
Minimal day-7 retention:
```bash
ae-cli analysis +build_retention_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":7}' --retention '{"initialEvent":"注册","returnEvent":"商品购买","unitNum":7}'
```

Retention with relation property and event-level filters:
```bash
ae-cli analysis +build_retention_analysis_qp --project_id 3137 --time_range '{"mode":"start_to_yesterday","startTime":"2021-05-18"}' --retention '{"initialEvent":"special_data","returnEvent":"商品购买","unitNum":7,"relationEventPropertyName":"账户ID","initialFilters":[{"eventPropertyName":"账户ID","operator":"exists"}],"returnFilters":[{"eventPropertyName":"账户ID","operator":"exists"},{"eventPropertyName":"城市","operator":"exists"}],"returnFilterRelation":"or","filters":[{"field":{"name":"账户ID","type":"event_property"},"operator":"exists"},{"field":{"name":"城市","type":"event_property"},"operator":"exists"}],"groups":[{"field":{"name":"账户ID","type":"event_property"}}]}' --relation or --time_particle_size day
```

## Decision Rules
- Use `--authenticated_only true` only when the user explicitly wants authenticated assets; do not add this flag to `+query_adhoc`.
- After successful build, call `+query_adhoc --model_type retention --qp '<response.qp>'`.
- If build returns non-generated status, stop and ask user to clarify; do not call `+query_adhoc`.
- Wrap JSON parameters in single quotes to avoid shell escaping issues.
- Do not pre-query metrics or metadata. Pass user-provided event/property names to the builder and let it resolve them.
- Do not put global filter relation inside `retention`; pass it as top-level CLI flag `--relation`.
- For overall/totals retention, omit `--time_particle_size`; only set it when user asks for day/week/month breakdown.
- If the user gave a time zone, keep it for `+query_adhoc --zone_offset`; do not put it in the builder JSON.

## Recommended Chaining
- `+build_retention_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type retention --qp '<response.qp>'`
