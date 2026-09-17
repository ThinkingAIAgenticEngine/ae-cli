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
