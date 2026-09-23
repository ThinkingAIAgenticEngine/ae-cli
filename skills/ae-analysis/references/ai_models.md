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

Calendar settings belong at the definition root, alongside `time_range` or the model-specific object:

- `first_day_of_week`: Monday `1` through Sunday `7`. Available for all analysis/report models except SQL. It controls calendar grouping and relative-week filters; omission preserves the native default. For tag reports it is alongside `tag`, not inside `tag`.
- `complete_incomplete_period`: available for `event`, `retention`, `funnel`, `distribution`, and `interval`. Set `false` to preserve selected date bounds when grouping by week/month/quarter/year; `true` expands bounds to complete periods. Omission keeps the native behavior. For example, a Tuesday-through-Thursday query grouped by week must explicitly use `false` when the user wants only those three days.
- Retention's `summary_first_day_of_week` is a separate setting inside `retention` for summary rows. Preserve it together with the root `first_day_of_week` when editing a saved report.

Analysis identity:

- Root `analysis_entity` is supported by `event`, `retention`, `funnel`, `interval`, `distribution`, `path`, `attribution`, `revenue`, `prop_analysis`, and `heat_map`. Omission uses the primary user ID. SQL, ranking, and tag reports do not accept this selector.
- Supply exactly one selector: `{"id": 42}`, `{"name": "Devices"}`, or `{"property": {"name": "device_id", "type": "event_property"}}`. IDs must be positive and come from the current project's `project.entity.list` capability. Names must exactly identify one visible entity. Never guess entity IDs.
- Property references support `event_property` or `user_property` and must resolve to a visible numeric or string property. The property must be bound to a visible registered project entity; inspect `project entity list` or create the test entity before use. This selector preserves older reports that omitted the entity ID, but does not bypass entity registration. Do not supply native property metadata such as `tableType` or `selectType`.
- Entity choices survive saved-report get → update → run. For `event` and `prop_analysis`, root `analysis_entity` selects the drilldown identity; it does not change metric counting. Event metrics count their individual `quota_entities` overrides, while property metrics retain native user semantics. Preserve returned `quota_entities`, `quota_time_ranges`, and `event_split_indexes` on regular event metrics as well as formulas.
- For heat maps, root `analysis_entity` controls metric counting. `heat_map.event_processing.entity` independently controls the entity used when selecting FIRST/LAST/MAX/MIN events; omission there uses primary users even when the metric counts another entity.

Field reference:

```json
{"field":{"name":"country","type":"user_property"}}
```

- `type` can be `event_property`, `user_property`, `cluster`, or `tag`.
- Omit `type` only when the field name is unambiguous.

Dimension options for `groups` (including user-property analysis groups):

- `bucket_mode`: `discrete`, `automatic`, or `custom` for numeric properties. `custom` requires a non-empty, strictly increasing `bucket_boundaries` number array, for example `[0, 7, 30]`; omit boundaries for the other modes.
- `array_grouping`: `array_group` (whole list), `array_set_group` (distinct element set), or `array_item_group` (individual elements).
- `time_granularity`: `hour`, `day`, `week`, `month`, `minute`, `minute5`, `minute10`, `quarter`, `year`, or `millisecond` for date/time properties.
- `funnel_step`: the one-based funnel step supplying grouping values. It must refer to an existing step; omit outside funnel analysis.
- `retention_source`: `initial_event` or `return_event`; omit outside retention analysis.
- Tag/cluster dimensions also accept `cluster_date_policy` and `specified_cluster_date` with the same rules as filters below.

Preserve these options when editing saved report definitions. Grouping by a field with its default settings can produce different results from grouping by that field's numeric intervals, array elements, historical values, or a selected funnel/retention event.

```json
{"field":{"name":"amount","type":"event_property"},"bucket_mode":"custom","bucket_boundaries":[0,30,60]}
```

Filter:

```json
{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}
```

- Operators include `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `exists`, `not_exists`, `between`, `contains`, and `not_contains`.
- Omit `values` for `exists` and `not_exists`.
- Use exactly two values for `between`.

Relative date/time filters use `operator: "relative_current_time"` or `"relative_event_time"` with `time_relative`:

- `relative_current_time`: `before`, `between`, `that_day`, `that_week`, or `that_month`. Offsets are in days relative to the effective current date.
- `relative_event_time`: `before`, `after`, `absolute`, `range`, `that_day`, `that_week`, or `that_month`. Offset modes also require `time_unit: "day"|"hour"|"minute"`.
- `between` and `range` require two string values; other offset modes require one. `that_day`, `that_week`, and `that_month` need no `values`.
- For retention phase-specific event-time filters, preserve `relative_event_time_retention_phase` (`0` initial event, `1` return event).
- Preserve these fields when editing saved definitions. Event-only filters using `event_property_name` carry the same relative-time options.

Compound filter group:

```json
{
  "relation": "or",
  "items": [
    {
      "relation": "and",
      "items": [
        {"field":{"name":"discount_multiplier","type":"event_property"},"operator":"eq","values":["2.4"]},
        {"field":{"name":"current_user_level","type":"event_property"},"operator":"gte","values":["100"]},
        {"field":{"name":"registered_days","type":"event_property"},"operator":"gte","values":["3"]}
      ]
    },
    {"field":{"name":"discount_multiplier","type":"event_property"},"operator":"eq","values":["1.4"]}
  ]
}
```

- A compound node has `relation` plus `items` and no `field` or `operator`. In ad-hoc definitions and historical report reads, each item can be a leaf filter or another compound node.
- `items` must be non-empty. Every nested leaf must retain its own `field` and `operator`; validation applies at every depth.
- Use `items` inside every compound node. Do not rename it to `filters`.
- Put compound nodes in the same `filters` arrays that accept leaf filters, including report-level and metric-level filters.
- This recursive shape applies to ad-hoc user-property analysis filters and event-only filters (such as funnel steps, retention initial/return filters, and revenue events), and is preserved by historical report reads. Event-only leaves use `event_property_name`; user-property leaves use `field` with `user_property`, `tag`, or `cluster`. A compound node contains only `items` and optional `relation`; do not put leaf values, operators, or time options on the group itself.
- Saved-report create/update follows the analysis page: at most one compound group level, with leaf-only, non-empty `items`. The capability schema rejects deeper or empty groups as `INVALID_CAPABILITY_INPUT`; use the returned field path or schema keyword to correct the structure. If `analysis report get` returns a deeper historical tree, never flatten it or discard unread conditions. Omit `definition` for an unrelated metadata update; replacing the definition requires an explicitly approved page-compatible tree.

Tag and cluster result-date policy:

- `cluster_date_policy` is valid only when `field.type` is `tag` or `cluster`.
- `LATEST` uses the latest computed tag/cluster result and is the default when the field is omitted.
- `AUTO` dynamically matches the computed result for each analysis date. Use it for historical daily analysis that must evaluate each day against that day's tag or cluster state.
- `SPECIFIED` uses one fixed result date and requires `specified_cluster_date` in `yyyy-MM-dd` format. Do not send `specified_cluster_date` with `LATEST` or `AUTO`.

For example, the following filter evaluates `<verified_tag_name> != <excluded_tag_value>` against each analysis day's tag result:

```json
{
  "field": {"name": "<verified_tag_name>", "type": "tag"},
  "operator": "neq",
  "values": ["<excluded_tag_value>"],
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

### Report time-range round trips

Report definitions preserve dynamic day/week/month/quarter/year ranges, fixed-start ranges, and comparison periods when read and saved again. Disabled comparisons are omitted even if a report retains stale comparison configuration.

Use `mode: "offset_range"` with `unit`, `start_offset`, and `end_offset` for a range anchored before the current unit: offsets are inclusive and must satisfy `0 <= start_offset <= end_offset`. For example `{ "mode": "offset_range", "unit": "day", "start_offset": 7, "end_offset": 13 }` selects days 7 through 13 before today. The same fields are supported in `comparison_time_ranges`; `previous_period` remains the preferred way to compare with the immediately preceding equal-length period.
