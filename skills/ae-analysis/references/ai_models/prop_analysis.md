# `prop_analysis` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

`prop_analysis` dimensions and filters support `user_property`, `cluster`, and `tag`; they do not support `event_property`.

Use for user-property metrics, grouping, filters, and user-crowd comparison.

```json
{
  "prop_analysis": {
    "metric": {"aggregation": "user_count"},
    "groups": [
      {"field": {"name": "country", "type": "user_property"}}
    ],
    "filters": [
      {"field": {"name": "vip_level", "type": "user_property"}, "operator": "gte", "values": ["3"]}
    ],
    "user_crowds": [
      {
        "name": "US users",
        "filters": [
          {"field": {"name": "country", "type": "user_property"}, "operator": "eq", "values": ["US"]}
        ]
      }
    ]
  }
}
```

For property aggregations, pass the user property:

```json
{"prop_analysis":{"metric":{"aggregation":"distinct_count","property":"account_id"}}}
```

## Aggregation

- `prop_analysis`: use `user_count` without property; numeric properties support `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `median`, `variance`, and `stddev`; string/date/datetime properties support `distinct_count`; boolean properties support `true_count`, `false_count`, `not_empty_count`, `empty_count`, and `distinct_count`. `percentile` is not supported.
