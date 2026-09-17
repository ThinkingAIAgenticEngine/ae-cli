# `rank_list` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for ranking users/entities by an event metric.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "rank_list": {
    "rank_dimension": {"field": {"name": "#account_id", "type": "user_property"}},
    "rank_event": "purchase",
    "rank_aggregation": "sum",
    "rank_property": "amount",
    "rank_type": "dense_rank",
    "order_by": "DESC"
  }
}
```

`rank_type` values: `rank`, `dense_rank`, or `row_rank`.

## Aggregation

- `rank_list`: without property use `total_count`, `user_count`, or `per_user_count`; numeric properties support `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `median`, `variance`, and `stddev`; string/date/datetime properties support `distinct_count`; boolean properties support `true_count`, `false_count`, `not_empty_count`, `empty_count`, and `distinct_count`. `percentile` is not supported.
