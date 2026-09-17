# `retention` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for retained/lost users from an initial event to a return event.

For a rate aggregated across cohorts or entry-date windows, request `rtn_rate_or_num=count`, even when the user asks for a rate. Compute `sum(Dn return counts) / sum(initial counts)` over the same selected cohort set. Use `rate` when directly displaying a returned rate without regrouping it.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "time_particle_size": "day",
  "retention": {
    "initial_event": "register",
    "return_event": "login",
    "stat_type": "retention",
    "unit_num": 1,
    "rtn_rate_or_num": "count",
    "groups": [
      {"field": {"name": "channel", "type": "user_property"}}
    ]
  }
}
```

Use `stat_type=lost` for lost-user analysis. User-count requests also use `count`. The initial `time_range` defines cohort entry dates, not the full return-observation range. For D1, use day grain and `unit_num=1`; the last initial day needs the next complete project day of return data. Keep the initial window unchanged.

For a comparison across entry-date windows, one daily retention query can cover their combined entry range; partition its count rows by the requested dates locally. Use `rtn_rate_or_num=count` to obtain each cohort's denominator and D1 numerator. Read the actual titles and metric labels; count/rate rows and stage totals are separate. Do not query initial counts again when these rows already answer the same cohort-count question. Cohort counts do not replace distinct users across the entire period. No data-arrival watermark is guaranteed: unknown maturity stays unknown, and repeating the same query cannot establish it.

Initial-event and return-event property filters use the retention-specific shape below. Put them inside `retention`; use `event_property_name` instead of a generic `field` object. Do not use top-level `filters`, `retention.filters`, or `initial_event_filters`.

```json
{
  "time_range": {"mode": "custom", "start_time": "2026-08-18 00:00:00", "end_time": "2026-08-18 23:59:59"},
  "time_particle_size": "day",
  "retention": {
    "initial_event": "register",
    "initial_filters": [
      {"event_property_name": "case_id", "operator": "eq", "values": ["retention_test"]}
    ],
    "initial_filter_relation": "and",
    "return_event": "login",
    "return_filters": [
      {"event_property_name": "case_id", "operator": "eq", "values": ["retention_test"]}
    ],
    "return_filter_relation": "and",
    "stat_type": "retention",
    "unit_num": 1,
    "rtn_rate_or_num": "rate",
    "groups": [
      {"field": {"name": "channel", "type": "event_property"}}
    ]
  }
}
```

## Aggregation

- `retention` simultaneous metrics: without property use `total_count`, `user_count`, or `per_user_count`; numeric properties support only `sum` and `avg_per_user`; boolean properties support only `true_count`, `false_count`, `not_empty_count`, and `empty_count`.

## Returned rows

If retention result files already exist, the optional shared [result reader](../analysis_data_retrieval.md#preserve-and-interpret-results) preserves the columns and row types together. A day-grain D1 result can look like this (illustrative values; use the actual returned titles and metric labels):

| Date | Initial users | Metric | D0 | D1 |
| --- | ---: | --- | ---: | ---: |
| <entry date> | 100 | <count label> | 100 | 30 |
| <entry date> | 100 | <rate label> | 100% | 30% |

Here D1 is the fifth column; the fourth is D0. Grouping and longer intervals change the columns. Select the requested Dn by title, and daily count rows by date and metric label. Stage summaries are separate rows. If the local view omits a needed date or column, read it from the saved file before deciding whether another query is needed.
