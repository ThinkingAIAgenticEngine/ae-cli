# analysis +build_funnel_analysis_qp (build funnel analysis qp)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated funnel-analysis QP from structured intent.
- Use in the mandatory builder flow before `+query_adhoc --model_type funnel`.
- This command builds QP only and does not execute the analysis query.
- This is the `funnel` builder in the ten-model guided QP builder set.
- Use this builder for funnel ad hoc requests; do not manually build funnel QP through `+get_analysis_query_schema`.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase DTO names.
- Correct nested keys: `startTime`, `endTime`, `relationEventPropertyName`, `eventPropertyName`.
- Funnel step filters are event-property-only and use `eventPropertyName`; they do not use the generic `field` object.
- Funnel global filters and groups use the generic `field` object.
- Do not run syntax examples with placeholder JSON. Fill `time_range` and `funnel` with valid nested fields before calling this command.
- `--dry-run` still requires the same required flags as a real builder call. Never run this command as dry-run without `--project_id`, `--time_range`, and `--funnel`.
- Do not call `get_analysis_query_schema`, `list_events`, `list_properties`, `list_metrics`, or `get_metric` before this builder for normal ad-hoc analysis. The builder resolves events and properties internally.
- Builder commands do not accept `zone_offset`; pass `--zone_offset` to `+query_adhoc` after the builder succeeds.
- If the request misses time range, at least two steps, or conversion window, stop and ask the user to clarify.

## Command Syntax
```bash
ae-cli analysis +build_funnel_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --funnel '<valid_funnel_json>'
ae-cli analysis +build_funnel_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --funnel '<valid_funnel_json>' --relation and --time_particle_size day
ae-cli analysis +build_funnel_analysis_qp --project_id <project_id> --time_range '<valid_time_range_json>' --funnel '<valid_funnel_json>' --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--authenticated_only` | No | Resolve only authenticated assets while building the QP. Do not pass this flag to `+query_adhoc`. |
| `--time_range` | Yes | Funnel analysis time range JSON |
| `--funnel` | Yes | Funnel intent JSON |
| `--relation` | No | Top-level funnel filter relation. Supported values: and, or. Default: and |
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

`--funnel` object:
```json
{
  "steps":[
    {"event":"special_data","filters":[{"eventPropertyName":"账户ID","operator":"exists"}]},
    {"event":"商品购买","filters":[{"eventPropertyName":"账户ID","operator":"exists"},{"eventPropertyName":"城市","operator":"exists"}],"relation":"or"}
  ],
  "window":{"value":180,"unit":"day"},
  "relationEventPropertyName":"账户ID",
  "filters":[
    {"field":{"name":"账户ID","type":"event_property"},"operator":"exists"},
    {"field":{"name":"城市","type":"event_property"},"operator":"exists"}
  ],
  "groups":[{"field":{"name":"账户ID","type":"event_property"}}]
}
```

Funnel fields:
| Field | Required | Description |
|---|---|---|
| `steps` | Yes | At least two step objects |
| `steps[].event` | Yes | Event display name, technical name, or remark |
| `steps[].filters` | No | Step-level event-property filters. Use `eventPropertyName`, not `field`. |
| `steps[].relation` | No | Relation between filters in this step: `and` or `or`. Default: `and`. |
| `window.value` | Yes | Conversion window size. Must be greater than 0. |
| `window.unit` | No | `second`, `minute`, `hour`, `day`, `week`, `month`. Default: `day`. |
| `relationEventPropertyName` | No | Event property used as common relation property across all steps. Must resolve compatibly in every step event. |
| `filters` | No | Global funnel filters using generic `FilterRequest[]` |
| `groups` | No | Global group-by dimensions using generic `DimensionRequest[]` |

Generic filter object for `funnel.filters`:
```json
{"field":{"name":"账户ID","type":"event_property"},"operator":"exists"}
```

Step filter object for `steps[].filters`:
```json
{"eventPropertyName":"账户ID","operator":"exists"}
```

Group object:
```json
{"field":{"name":"账户ID","type":"event_property"}}
```

Field types for `funnel.filters` and `funnel.groups`:
| Type | Meaning |
|---|---|
| `event_property` | Event property |
| `user_property` | User property |
| `cluster` | User cluster |
| `tag` | User tag |

Filter operator rules:
| Operator | Values |
|---|---|
| `exists`, `not_exists`, `is_true`, `is_false` | Omit `values` |
| `between` | Exactly two values |
| `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`, `not_contains`, `regex`, `not_regex` | Non-empty `values` array |
| `in_cluster`, `not_in_cluster` | Cluster operator; values are not required by builder validation |

## Examples
Minimal two-step funnel:
```bash
ae-cli analysis +build_funnel_analysis_qp --project_id 3137 --time_range '{"mode":"previous","unit":"day","value":1}' --funnel '{"steps":[{"event":"special_data"},{"event":"商品购买"}],"window":{"value":180,"unit":"day"}}'
```

Complex funnel with relation property, step filters, global OR filters, and group:
```bash
ae-cli analysis +build_funnel_analysis_qp --project_id 3137 --time_range '{"mode":"start_to_yesterday","startTime":"2021-05-18"}' --funnel '{"steps":[{"event":"special_data","filters":[{"eventPropertyName":"账户ID","operator":"exists"}]},{"event":"商品购买","filters":[{"eventPropertyName":"账户ID","operator":"exists"},{"eventPropertyName":"城市","operator":"exists"}],"relation":"or"}],"window":{"value":180,"unit":"day"},"relationEventPropertyName":"账户ID","filters":[{"field":{"name":"账户ID","type":"event_property"},"operator":"exists"},{"field":{"name":"城市","type":"event_property"},"operator":"exists"}],"groups":[{"field":{"name":"账户ID","type":"event_property"}}]}' --relation or
```

Then execute with UTC-11 after builder returns `status=generated`:
```bash
ae-cli analysis +query_adhoc --project_id 3137 --model_type funnel --qp '<response.qp>' --zone_offset -11
```

## Decision Rules
- Use `--authenticated_only true` only when the user explicitly wants authenticated assets; do not add this flag to `+query_adhoc`.
- After successful build, call `+query_adhoc --model_type funnel --qp '<response.qp>'`.
- If build returns non-generated status, stop and ask user to clarify; do not call `+query_adhoc`.
- Wrap JSON parameters in single quotes to avoid shell escaping issues.
- Do not pre-query metrics or metadata. Pass user-provided event/property names to the builder and let it resolve them.
- Do not put global filter relation inside `funnel`; pass it as top-level CLI flag `--relation`.
- If the user says "step 1 account ID group", builder cannot take a step index for groups; express it as `groups:[{"field":{"name":"账户ID","type":"event_property"}}]` and ask for clarification if that is ambiguous.
- If the user gave a time zone, keep it for `+query_adhoc --zone_offset`; do not put it in the builder JSON.

## Recommended Chaining
- `+build_funnel_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type funnel --qp '<response.qp>'`
