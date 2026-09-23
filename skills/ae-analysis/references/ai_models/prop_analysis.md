# `prop_analysis` AI-facing definition

Shared field references and filters: [common building blocks](../ai_models.md#common-building-blocks).

`prop_analysis` dimensions and filters support `user_property`, `cluster`, and `tag`; they do not support `event_property`.

Use for user-property metrics, grouping, filters, and user-crowd comparison.

The definition accepts only the top-level `prop_analysis` object. Place `metric`, `groups`, `filters`, and `user_crowds` inside it; top-level `time_range` and `time_particle_size` are unsupported.

For a historical-date request, preserve the requested date constraint and use a query model that can express it, or explain the capability gap. Removing that constraint and returning current property statistics does not answer the historical question.

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

Global `filters` and `user_crowds[].filters` both support recursive `items`/`relation` groups. Date/time leaves preserve the shared relative-time options, and tag/cluster leaves preserve `cluster_date_policy` plus `specified_cluster_date`. A saved report read retains crowd names, crowd filter trees, and each crowd's relation. Keep these when updating the report; do not replace a selected crowd with all users.
