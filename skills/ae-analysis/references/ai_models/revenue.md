# `revenue` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for revenue cohort metrics such as LTV, ROI, revenue, and cost.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 30},
  "initial_event": {"event": "register"},
  "pay_event": {"event": "purchase"},
  "revenue_metric": {"event": "purchase", "aggregation": "sum", "property": "amount"},
  "cost_metric": {"event": "ad_cost", "aggregation": "sum", "property": "cost"},
  "observation_days": 14,
  "selected_metrics": ["payAmount", "ltv", "roi"],
  "groups": [
    {"field": {"name": "channel", "type": "user_property"}}
  ]
}
```

`cost_metric` is optional when the user does not ask for cost/ROI.
`selected_metrics` supports `payUsers`, `payAmount`, `cumPayUsers`, `cumPayAmount`, `payRate`, `cumPayRate`, `ltv`, `ltvMultiple`, `rollingLtv`, and `roi`.
Select at most four metrics per query. The semantic compiler rejects more than four selections and requires `cost_metric` when `roi` is selected. If more metrics are required, split the selections into non-overlapping batches with the same definition and scope, then join results by verified cohort/group keys. Check returned titles for every requested metric; a successful response alone does not prove full metric coverage.

## Aggregation

- `revenue`: without property use `total_count`, `user_count`, or `per_user_count`; numeric properties support `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `median`, `variance`, and `stddev`; string/date/datetime properties support `distinct_count`; boolean properties support `true_count`, `false_count`, `not_empty_count`, `empty_count`, and `distinct_count`. `percentile` is not supported.

## Formula revenue and cost metrics

Both `revenue_metric` and `cost_metric` accept a formula with alias dependencies. Omit `event`, `aggregation`, `property`, `filters`, and `relation` on formula metrics; each dependency supplies its own event and aggregation. Regular revenue metrics default to the pay event, and regular cost metrics default to the initial event when `event` is omitted.

```json
{
  "formula": "amount / users",
  "dependencies": [
    {"alias": "amount", "event": "purchase", "aggregation": "sum", "property": "amount"},
    {"alias": "users", "event": "purchase", "aggregation": "user_count"}
  ],
  "name": "ARPPU",
  "format": "float3"
}
```

Number formats are `float`, `float3`, `float4`, `integer`, and `percent`. Saved formulas may contain an expanded `formula`, `formulation`, and `custom_filters`; preserve that metadata on updates. Event and regular-metric filters support recursive `items`/`relation` groups using event-property leaves. `first_day_of_week` is between 1 (Monday) and 7 (Sunday).
