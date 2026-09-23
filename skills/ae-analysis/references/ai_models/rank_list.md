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

## Metric filters, accompanying columns, and formulas

- `rank_filters` and `rank_relation` apply only to the primary regular ranking metric. `filters` and `relation` apply globally. Both filter arrays preserve compound groups and relative-time conditions.
- `accompanying_metrics` is an ordered array of event metric definitions (`event`, `aggregation`, `property`, `filters`, `relation`, or `formula`/`dependencies`). Each entry can set `order_by: "ASC"|"DESC"|"NONE"`; default `NONE` displays the metric without using it to break ties. Backend limits on the number of columns still apply.
- `accompanying_properties` is an array of field dimensions. The main `rank_dimension` and accompanying properties support `array_grouping`, `time_granularity`, and historical tag/cluster date policies. Numeric buckets, funnel steps, and retention sources are not rank-list options.
- For formula ranking, set `rank_formula` to a formula metric definition. Omit the mutually exclusive regular metric fields `rank_event`, `rank_aggregation`, `rank_property`, `rank_filters`, `rank_relation`, and `rank_quota_entities`; put formula filters inside `rank_formula.filters`. Keep the outer `order_by` as `ASC` or `DESC`.
- Formula dependencies and accompanying metrics use the same aggregation restrictions as the primary metric, including the exclusion of `percentile`. Preserve saved formula metadata returned by report reads.

```json
{
  "rank_dimension": {"field":{"name":"#account_id","type":"user_property"}},
  "rank_formula": {
    "formula": "revenue / users",
    "dependencies": [
      {"alias":"revenue","event":"purchase","aggregation":"sum","property":"amount"},
      {"alias":"users","event":"purchase","aggregation":"user_count"}
    ]
  },
  "order_by": "DESC",
  "accompanying_metrics": [{"event":"purchase","aggregation":"total_count","order_by":"ASC"}],
  "accompanying_properties": [{"field":{"name":"country","type":"user_property"}}]
}
```

Use the object above as `rank_list` inside a definition with `time_range`. Saved report reads retain the primary filters, accompanying columns, their ordering, and formula definitions; preserve all of them during updates.

Ranking accepts one root `comparison_time_ranges` entry using the shared event comparison shape, for example `[{"mode":"previous_period","display_name":"Previous period"}]`. The native ranking engine supports at most one comparison period; multiple entries are rejected. Preserve the returned comparison period on report edits so the comparison values and rank changes remain available.

Preserve `rank_quota_entities` returned for a regular primary ranking metric. Formula ranking keeps its identity overrides inside `rank_formula.quota_entities`; accompanying metrics keep theirs inside each `quota_entities`. These independent identities affect distinct-user counts and per-user denominators and must survive saved-report edits. Do not supply regular `rank_quota_entities` together with `rank_formula`.
