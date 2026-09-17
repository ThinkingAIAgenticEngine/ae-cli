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
`selected_metrics` supports `payUsers`, `payAmount`, `cumPayUsers`, `cumPayAmount`, `payRate`, `cumPayRate`, `ltv`, `ltvMultiple`, and `roi`.
Select at most four metrics per query. The revenue service keeps only the first four supported selections and removes ROI when cost is absent. If more metrics are required, split the selections into non-overlapping batches with the same definition and scope, then join results by verified cohort/group keys. Check returned titles for every requested metric; a successful response alone does not prove full metric coverage.

## Aggregation

- `revenue`: without property use `total_count`, `user_count`, or `per_user_count`; numeric properties support `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `median`, `variance`, and `stddev`; string/date/datetime properties support `distinct_count`; boolean properties support `true_count`, `false_count`, `not_empty_count`, `empty_count`, and `distinct_count`. `percentile` is not supported.
