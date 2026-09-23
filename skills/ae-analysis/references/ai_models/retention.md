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

- `retention` simultaneous metrics: without property use `total_count`, `user_count`, or `per_user_count`; numeric properties support `sum`, `avg_per_user`, and `cumulative_avg_per_user` (the saved page's A114 stage accumulated per-user value); boolean properties support only `true_count`, `false_count`, `not_empty_count`, and `empty_count`. `cumulative_avg_per_user` requires the matching Common round-trip fix; it is not a supported event-analysis aggregation.

## Saved formula round trips

`analysis report get` preserves a saved simultaneous formula's `formulation`, `custom_filters`, `custom_event_desc`, `event_desc`, `format`, and `event_type` when present. Keep these fields unchanged when updating the returned definition. In particular, `custom_filters[].index` binds filters to each formula occurrence. Do not replace these saved fields with newly inferred dependencies. New formulas still require `formula` plus explicit `dependencies`.

## Metric roles and combination

`retention.simultaneous_metrics` supports at most one `return_users` metric (the default role) and one `initial_date` metric. The latter measures users on their cohort entry date. Repeated roles are rejected because the engine has one calculation slot per role.

```json
{
  "simultaneous_metrics": [
    {
      "role": "return_users", "event": "payment", "aggregation": "sum", "property": "amount",
      "filters": [{"event_property_name": "currency", "operator": "eq", "values": ["CNY"]}],
      "relation": "and", "format": "float3"
    },
    {
      "role": "initial_date", "event": "register", "aggregation": "user_count",
      "combine_operator": "DIVIDE", "initial_date_first": false, "combined_format": "float4"
    }
  ]
}
```

Place this object inside `retention`. `combine_operator` belongs to `initial_date` and requires both roles; allowed values are `ADD`, `SUBTRACT`, `MULTIPLY`, and `DIVIDE`. `initial_date_first=false` puts the return-user metric first. The example divides return-user revenue by the initial-date user count. `initial_date_first` and `combined_format` require a combination operator. Number formats are `float`, `float3`, `float4`, `percent`, and `integer`.

Both roles support `formula` and `dependencies` with the same retention aggregation restrictions. Use bare aliases for new formulas. Preserve returned `formulation` and `custom_filters` when updating a saved formula; they carry the native dependency metadata and filters. Metric `filters` use event-only leaves and support recursive `items`/`relation` groups.

`relation_event_property_name` supplies a shared relation property. `initial_relation_event_property_name` and `return_relation_event_property_name` override it for the two cohort events; both must resolve whenever either is configured. A `return_users` metric can override `relation_event_property_name` for its own event. All relation properties must have compatible types; relation overrides do not apply to `initial_date`.

## Grouping and summary settings

| Field inside `retention` | Values and meaning |
| --- | --- |
| `group_mode` | `RANGE_FIRST`: first initial event in the range; `PERIOD_FIRST`: first initial event per day/week/month; `PERIOD_EACH`: every initial event per period. Omission preserves the environment default. |
| `return_group_mode` | `RANGE_FIRST` or `RANGE_EACH` for return-event grouping. |
| `relation_property_as_group` | Whether to include the relation property in result groups; omission preserves the native default. |
| `summary_first_day_of_week` | Monday `1` through Sunday `7`, for weekly summary rows. |
| `hide_incomplete_data` | Whether to hide incomplete retention periods. |
| `only_simultaneous_metrics` | Show only simultaneous metrics; defaults to true when metrics are supplied. |
| `stage_summary` | `initial_users`, `retained_users`, and `initial_date_metric`: `sum` or `avg`; `simultaneous_metric`: `sum`, `avg`, or `weight_avg`. |

Dimension `retention_source` chooses `initial_event` or `return_event`. Preserve all returned grouping and summary settings during report edits: they affect populations and reported values. `unit_num` must be nonnegative; `stat_type` accepts only `retention` or `lost`.

## Returned rows

If retention result files already exist, the optional shared [result reader](../analysis_data_retrieval.md#preserve-and-interpret-results) preserves the columns and row types together. A day-grain D1 result can look like this (illustrative values; use the actual returned titles and metric labels):

| Date | Initial users | Metric | D0 | D1 |
| --- | ---: | --- | ---: | ---: |
| <entry date> | 100 | <count label> | 100 | 30 |
| <entry date> | 100 | <rate label> | 100% | 30% |

Here D1 is the fifth column; the fourth is D0. Grouping and longer intervals change the columns. Select the requested Dn by title, and daily count rows by date and metric label. Stage summaries are separate rows. If the local view omits a needed date or column, read it from the saved file before deciding whether another query is needed.
