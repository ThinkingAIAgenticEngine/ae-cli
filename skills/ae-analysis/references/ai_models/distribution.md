# `distribution` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for user distribution buckets for an event or property metric.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "distribution_metrics": [
    {
      "event": "purchase",
      "aggregation": "sum",
      "property": "amount",
      "filters": [
        {
          "field": {"name": "vip_users", "type": "cluster"},
          "operator": "in_cluster"
        }
      ],
      "relation": "and",
      "interval_type": "user_defined",
      "quota_interval_arr": [100, 1000, 10000]
    }
  ],
  "groups": [
    {"field": {"name": "country", "type": "user_property"}}
  ]
}
```

Use `interval_type=def` for automatic buckets, `user_defined` for explicit numeric boundaries, and `discrete` to group by raw values.

Distribution filters must be attached to the corresponding `distribution_metrics[].filters`.
Do not use top-level `filters` or `relation` in a distribution definition.
When multiple metrics need the same filter, attach it to each metric explicitly. If the requested filter scope is ambiguous, clarify which metric it applies to before running the analysis.

## Aggregation

- `distribution`: without property use `count`, `active_days`, or `active_hours`; numeric properties support `sum`, `avg`, `max`, `min`, `distinct_count`, `median`, `percentile`, `variance`, and `stddev`; string/date/datetime properties support `distinct_count`; boolean properties support `true_count`, `false_count`, `not_empty_count`, `empty_count`, and `distinct_count`.
