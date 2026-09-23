# `heat_map` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for two-dimensional heat map analysis based on numeric event coordinate properties.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "heat_map": {
    "hot_event": "click",
    "hot_aggregation": "total_count",
    "x_prop": "screen_x",
    "y_prop": "screen_y",
    "filters": [
      {"field": {"name": "page", "type": "event_property"}, "operator": "eq", "values": ["home"]}
    ]
  }
}
```

For property metrics, set `hot_property` and use a property aggregation such as `sum` or `avg`.

## Aggregation

- `heat_map`: without property use `total_count`, `user_count`, or `per_user_count`; numeric properties support `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `median`, `variance`, and `stddev`; string/date/datetime properties support `distinct_count`; boolean properties support `true_count`, `false_count`, `not_empty_count`, `empty_count`, and `distinct_count`. `percentile` is not supported.

## Comparison groups, processing, and canvas

`heat_map.compared_groups` accepts uniquely named groups with independent recursive `filters` and `relation`. These are filtered groups within the selected time range. The heat-map engine does not support date comparison periods.

`event_processing` selects one event per entity before heat aggregation. `mode` is `FIRST`, `LAST`, `MAX`, or `MIN`: FIRST/MIN select the minimum ordering value and LAST/MAX the maximum. By default the ordering value is event time; optional `property` selects a numeric, string, date, or datetime field. `filters` and `relation` select events eligible for processing.

`canvas` limits coordinates to `x_min..x_max` and `y_min..y_max`. All four finite bounds are required, minima must not exceed maxima, and bounds support at most 10 integer digits and 4 decimal places. Optional `background` preserves an already uploaded image using `attachment_name`, `original_filename`, `created_at`, `width`, `height`, and `byte_size`. It does not upload a local file. Omit canvas to include all non-null coordinates.

Example fields inside `heat_map`:

```json
{
  "compared_groups": [
    {"name": "Home page", "filters": [{"field": {"name": "page", "type": "event_property"}, "operator": "eq", "values": ["home"]}]},
    {"name": "All pages"}
  ],
  "event_processing": {"mode": "LAST"},
  "canvas": {"x_min": 0, "x_max": 1920, "y_min": 0, "y_max": 1080}
}
```

Hot-event filters, comparison groups, processing conditions, and canvas bounds/background metadata survive report get → update → run. X/Y coordinate properties must be numeric.
