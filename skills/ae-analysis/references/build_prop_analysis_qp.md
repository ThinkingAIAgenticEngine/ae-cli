# analysis +build_prop_analysis_qp (build property analysis qp)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model Analysis**

## Use Cases
- Build a validated `prop_analysis` QP from structured intent.
- Use in the mandatory builder flow before `+query_adhoc --model_type prop_analysis`.
- This command builds QP only and does not execute the analysis query.
- This is one of exactly four QP builders: `event`, `retention`, `funnel`, `prop_analysis`.
- Use this builder for property-analysis ad hoc requests; do not manually build prop_analysis QP through `+get_analysis_query_schema`.

## JSON Rules
- CLI flags use snake_case, but JSON object keys use camelCase DTO names.
- `prop_analysis` does not use `time_range`; do not pass time range to this command.
- `event_property` is not supported anywhere in `prop_analysis` fields.
- Field types for `groups`, `filters`, and `userCrowds[].filters` are limited to `user_property`, `cluster`, and `tag`.
- Do not run syntax examples with placeholder JSON. Fill `prop_analysis` with a valid metric and optional filters/groups before calling this command.
- `--dry-run` still requires the same required flags as a real builder call. Never run this command as dry-run without `--project_id` and `--prop_analysis`.
- Do not call `get_analysis_query_schema`, `list_properties`, `list_metrics`, or `get_metric` before this builder for normal ad-hoc analysis. The builder resolves user properties internally.
- Builder commands do not accept `zone_offset`; pass `--zone_offset` to `+query_adhoc` after the builder succeeds if needed.
- If the request misses the metric or asks for event properties, stop and ask the user to clarify.

## Command Syntax
```bash
ae-cli analysis +build_prop_analysis_qp --project_id <project_id> --prop_analysis '<valid_prop_analysis_json>'
ae-cli analysis +build_prop_analysis_qp --project_id <project_id> --prop_analysis '<valid_prop_analysis_json>' --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--prop_analysis` | Yes | User property analysis intent JSON |

## JSON Shape
`--prop_analysis` object:
```json
{
  "metric":{"aggregation":"user_count"},
  "groups":[{"field":{"name":"城市","type":"user_property"}}],
  "filters":[{"field":{"name":"账户ID","type":"user_property"},"operator":"exists"}],
  "relation":"and",
  "userCrowds":[
    {"name":"账户ID有值用户","filters":[{"field":{"name":"账户ID","type":"user_property"},"operator":"exists"}]}
  ]
}
```

Prop analysis fields:
| Field | Required | Description |
|---|---|---|
| `metric` | Yes | Single metric object |
| `groups` | No | User property / cluster / tag group-by fields |
| `filters` | No | User property / cluster / tag filters |
| `relation` | No | Relation between top-level filters: `and` or `or`. Default: `and`. |
| `userCrowds` | No | Optional user crowd comparisons |

Metric fields:
| Field | Required | Description |
|---|---|---|
| `aggregation` | Yes | `user_count`, `sum`, `avg`, `max`, `min`, `distinct_count`, `true_count`, `false_count`, `not_empty_count`, `empty_count`, `median`, `percentile`, `variance`, `stddev` |
| `property` | Required except `user_count` | User property display name, technical name, or remark |

Field object:
```json
{"name":"城市","type":"user_property"}
```

Allowed field types:
| Type | Meaning |
|---|---|
| `user_property` | User property |
| `cluster` | User cluster |
| `tag` | User tag |

Filter object:
```json
{"field":{"name":"账户ID","type":"user_property"},"operator":"exists"}
```

User crowd object:
```json
{"name":"付费用户","filters":[{"field":{"name":"是否付费","type":"user_property"},"operator":"is_true"}],"relation":"and"}
```

Filter operator rules:
| Operator | Values |
|---|---|
| `exists`, `not_exists`, `is_true`, `is_false` | Omit `values` |
| `between` | Exactly two values |
| `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`, `not_contains`, `regex`, `not_regex` | Non-empty `values` array |
| `in_cluster`, `not_in_cluster` | Cluster operator; values are not required by builder validation |

## Examples
Minimal user count:
```bash
ae-cli analysis +build_prop_analysis_qp --project_id 3137 --prop_analysis '{"metric":{"aggregation":"user_count"}}'
```

User property average grouped by city:
```bash
ae-cli analysis +build_prop_analysis_qp --project_id 3137 --prop_analysis '{"metric":{"aggregation":"avg","property":"余额"},"groups":[{"field":{"name":"城市","type":"user_property"}}],"filters":[{"field":{"name":"账户ID","type":"user_property"},"operator":"exists"}]}'
```

User crowds with OR filter:
```bash
ae-cli analysis +build_prop_analysis_qp --project_id 3137 --prop_analysis '{"metric":{"aggregation":"user_count"},"filters":[{"field":{"name":"账户ID","type":"user_property"},"operator":"exists"},{"field":{"name":"城市","type":"user_property"},"operator":"exists"}],"relation":"or","userCrowds":[{"name":"账户或城市有值","filters":[{"field":{"name":"账户ID","type":"user_property"},"operator":"exists"},{"field":{"name":"城市","type":"user_property"},"operator":"exists"}],"relation":"or"}]}'
```

## Decision Rules
- After successful build, call `+query_adhoc --model_type prop_analysis --qp '<response.qp>'`.
- If build returns non-generated status, stop and ask user to clarify; do not call `+query_adhoc`.
- Wrap JSON parameters in single quotes to avoid shell escaping issues.
- Do not pre-query metrics or metadata. Pass user-provided property names to the builder and let it resolve them.
- Do not use `event_property` in prop_analysis. If the user asks for event property analysis, switch to event/funnel/retention builder or ask for clarification.
- If `userCrowds` is used, at most one group dimension is supported.
- If the user gave a time zone, keep it for `+query_adhoc --zone_offset`; do not put it in the builder JSON.

## Recommended Chaining
- `+build_prop_analysis_qp` -> if `status=generated` -> `+query_adhoc --model_type prop_analysis --qp '<response.qp>'`
