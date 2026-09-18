# Analysis AI-facing models

This file defines `model_type` spelling and shared AI-facing building blocks. Each model's definition contract has its own file below.

Open the selected model file directly from the registry and construct `definition` from its example and field rules. Use common building blocks only for fields supported by that model; add `time_range` or `time_particle_size` only when its contract supports them. Reuse unchanged content already read; other model files do not add requirements to the selected model.

## Capability coverage

- `analysis adhoc run/export`: supports the 12 analysis models only.
- `analysis report create/update`: supports the same 12 analysis models plus `tag` for saved tag report data.
- `analysis report-data run/export`, `analysis dashboard-report-data run/export`, and `analysis bi-panel-page-data run/export`: execute existing saved assets. They do not accept `model_type`; use their own command references.

Do not pass raw QP, `events`, `eventView`, `visualView`, frontend DTOs, schema-generated payloads, `scenario`, `history_tag`, or `cluster` as AI-facing `definition` or `model_type`.

## Model type registry

Common analysis models (9):

- [`event`](ai_models/event.md): event analysis
- [`retention`](ai_models/retention.md): retention analysis
- [`funnel`](ai_models/funnel.md): funnel conversion analysis
- [`distribution`](ai_models/distribution.md): distribution analysis
- [`attribution`](ai_models/attribution.md): attribution analysis
- [`interval`](ai_models/interval.md): interval analysis
- [`path`](ai_models/path.md): path analysis
- [`prop_analysis`](ai_models/prop_analysis.md): property analysis
- [`sql`](ai_models/sql.md): SQL analysis

Scenario analysis models (3):

- [`heat_map`](ai_models/heat_map.md): heat map analysis
- [`rank_list`](ai_models/rank_list.md): ranking analysis
- [`revenue`](ai_models/revenue.md): revenue analysis

Report write only:

- [`tag`](ai_models/tag.md): saved tag report data. Use this spelling in CLI.

## Common building blocks

Time range:

```json
{"mode":"previous","unit":"day","value":7}
```

- `mode`: `recent`, `previous`, `custom`, `start_to_today`, or `start_to_yesterday`.
- `recent` includes today/current unit; `previous` excludes today/current unit.
- For `custom`, pass `start_time` and `end_time`.
- For `start_to_today` and `start_to_yesterday`, pass `start_time`; omit `end_time` because the mode determines it.

Chinese natural-language time mapping (mandatory; do not infer a different mode):

| User wording | `time_range` input | Builder QP | Includes today |
|---|---|---|---|
| 最近7天 / 近7天 | `{"mode":"recent","unit":"day","value":7}` | `recentDay=0-7` | 是 |
| 过去7天 / 前7天 / 上7天 | `{"mode":"previous","unit":"day","value":7}` | `recentDay=1-7` | 否 |
| 今天 | `{"mode":"recent","unit":"day","value":1}` | `recentDay=0-1` | 是 |
| 昨天 | `{"mode":"previous","unit":"day","value":1}` | `recentDay=1-1` | 否 |

If the user explicitly says whether today is included, that explicit requirement overrides the phrase mapping. Relative dates are resolved at query time using the effective project/user timezone; do not invent absolute dates.

Field reference:

```json
{"field":{"name":"country","type":"user_property"}}
```

- `type` can be `event_property`, `user_property`, `cluster`, or `tag`.
- Omit `type` only when the field name is unambiguous.

Filter:

```json
{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}
```

- Operators include `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `exists`, `not_exists`, `between`, `contains`, and `not_contains`.
- Omit `values` for `exists` and `not_exists`.
- Use exactly two values for `between`.

Tag and cluster result-date policy:

- `cluster_date_policy` is valid only when `field.type` is `tag` or `cluster`.
- `LATEST` uses the latest computed tag/cluster result and is the default when the field is omitted.
- `AUTO` dynamically matches the computed result for each analysis date. Use it for historical daily analysis that must evaluate each day against that day's tag or cluster state.
- `SPECIFIED` uses one fixed result date and requires `specified_cluster_date` in `yyyy-MM-dd` format. Do not send `specified_cluster_date` with `LATEST` or `AUTO`.

For example, the following filter evaluates `tag_pay_level != 非R` against each analysis day's tag result:

```json
{
  "field": {"name": "tag_pay_level", "type": "tag"},
  "operator": "neq",
  "values": ["非R"],
  "cluster_date_policy": "AUTO"
}
```

A successful ad-hoc response returns the effective policy in `definition`. A saved report read returns the persisted policy when it is present in the report QP. Treat `AUTO` as the evidence for dynamic matching; `field.type=tag` or `sub_table_type=tag_by_static_condition` alone does not prove it.

Group:

```json
{"field":{"name":"country","type":"user_property"}}
```

Metric aggregation values must use semantic spelling, not internal A-codes. Use the selected model file's aggregation whitelist; it is specific to the model and property type.

For total event count use `total_count`; `count` belongs only to distribution. Internal `Axxx` codes are persisted page details and are not valid authored AI definitions.

Use verified canonical metadata when constructing an intent model. Discover missing definitions or fields with [metadata resolution](metadata_resolution.md). Successful responses expose internally resolved events/properties in `resolved`, including `input`, `resolved_name`, `match_type` and `path`; reuse those mappings.
