# `event` AI-facing definition

Shared input: [common building blocks](../ai_models.md#common-building-blocks).

Use for event metrics, trends, grouping, filters, and comparisons.

## Unknown business metric

When the requested metric's event, aggregation or property is unknown, resolve it with [`../metadata_resolution.md`](../metadata_resolution.md), confirm the business mapping once, then submit the complete definition:

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "metrics": [{"event": "<confirmed canonical event>", "aggregation": "<confirmed aggregation>"}]
}
```

A verified saved metric uses `{"event":"<verified_metric_name>"}` and supplies its own aggregation and property; omit those two fields when referencing it. An event measure requires a compatible aggregation and, when applicable, property. Do not invent an amount property to satisfy `sum`; discover the selected event's properties when needed. Reuse a verified canonical definition directly.

## Event measures and periods

For two comparable periods, batch compatible metrics in one event definition. If daily trends are also needed, use `day` with `comparison_time_ranges`; the response can contain each period's own totals and both daily series. Do not first query a combined daily window and try to sum daily unique users into period users. If only period totals are needed, use `total` (also the default when omitted).

```json
{
  "time_range": {"mode":"custom","start_time":"<main_start>","end_time":"<main_end>"},
  "comparison_time_ranges": [
    {"mode":"custom","start_time":"<baseline_start>","end_time":"<baseline_end>"}
  ],
  "time_particle_size": "day",
  "metrics": [
    {"event":"<user_event>","aggregation":"user_count"},
    {"event":"<amount_event>","aggregation":"sum","property":"<amount_property>"}
  ]
}
```

Replace placeholders with the requested windows and specified event-measure definition; retain confirmed metadata bindings through `--resolutions`. Use `[{"mode":"previous_period"}]` only for the immediately preceding equal-length period. Check the first real response, then reuse it. Read [event result totals](#event-totals-and-comparison-columns) for column blocks and `period_values`; saved metrics and non-additive aggregates need their own verified total semantics.

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "time_particle_size": "day",
  "metrics": [
    {"event": "login", "aggregation": "user_count"}
  ],
  "groups": [
    {"field": {"name": "country", "type": "user_property"}}
  ],
  "filters": [
    {"field": {"name": "country", "type": "user_property"}, "operator": "eq", "values": ["US"]}
  ],
  "relation": "and"
}
```

Property aggregation example:

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "metrics": [
    {"event": "purchase", "aggregation": "sum", "property": "amount"}
  ]
}
```

Omit `display_name` by default; apply business-facing labels in the final answer instead. Saved report create/update supports this optional display label for event, saved, and formula metrics. Add this optional field only when the target host's capability schema or a successful validation explicitly supports `display_name` for that command; a saved report supporting it does not prove ad-hoc support. If rejected, remove only the unsupported label, preserving events, aggregations, properties, filters, and formula dependencies. Use the returned metric titles to label results.

Formula metric example:

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "metrics": [
    {
      "formula": "revenue / users",
      "dependencies": [
        {"alias": "revenue", "event": "purchase", "aggregation": "sum", "property": "amount"},
        {"alias": "users", "event": "login", "aggregation": "user_count"}
      ]
    }
  ]
}
```

Formula rules:

- Write **bare aliases** only in `formula` (e.g. `"revenue / users"` or `"pay / dau"`).
- **Do not** write `alias.Axxx` (e.g. `"pay.A103"` / `"revenue.A103"`). Event aggregation codes come from that dependency's `aggregation`; saved-metric dependencies retain their own definition. The builder expands aliases to native event or saved-metric tokens.
- Verify the complete formula through one analysis query and inspect its resolved definition and result before saving it. Reuse that result; a formula does not require a removed QP builder.

## Formula operand filters

For a new or intentionally rewritten formula, put each operand's conditions in that dependency's `filters`; `relation` joins its filters and defaults to `and`. These use the generic filter shape (`field`, `operator`, `values`, or an `items`/`relation` group), not the event-only `event_property_name` shape. Resolve event properties against that dependency's event. For example, only the numerator below requires the spring festival and `win=true`; the denominator remains unfiltered:

```json
{
  "time_range": {"mode": "previous", "unit": "day", "value": 7},
  "metrics": [{
    "formula": "completed / participants",
    "dependencies": [
      {
        "alias": "completed", "event": "activity_dungeon", "aggregation": "total_count",
        "relation": "and",
        "filters": [
          {"field": {"type": "event_property", "name": "festival_name"}, "operator": "eq", "values": ["spring"]},
          {"field": {"type": "event_property", "name": "win"}, "operator": "is_true"}
        ]
      },
      {"alias": "participants", "event": "char_login", "aggregation": "total_count"}
    ]
  }]
}
```

Replace the example events and properties with verified project metadata. Use `is_true` / `is_false` without `values` for boolean conditions; do not encode `win=true` as `eq` with `[true]` or `["true"]`.

- To filter only the denominator, add `filters` only to its dependency. To give both sides different conditions, populate each dependency independently. One alias's filters apply to all its repeated occurrences; use different aliases for different filters on the same event. Binding follows expression occurrence order, not the order of `dependencies` and not deduplicated event names.
- Do not move operand filters to root `definition.filters` or to the formula metric's common `filters`: these are shared calculation scopes, not a substitute for numerator/denominator conditions. Keep any intentionally supplied common filters independent of the dependency conditions; never copy an operand's conditions there as a fallback.
- Compound groups use `{"relation":"and|or","items":[...]}`. Saved-report writes still obey the shared one-compound-level boundary; ad-hoc queries keep recursive support.
- Filters on a saved metric dependency are not supported; the server rejects them rather than ignoring them. Preserve that metric's existing definition or use an explicitly verified ordinary event dependency. Do not expand or replace a saved metric merely to bypass this restriction.
- Before using this shape on an older host, check its capability schema for dependency `filters` / `relation`. A new CLI alone does not add server compiler support. If unsupported, report the deployment prerequisite; never silently omit the operand filters.
- Choose one formula representation. Native `formulation` or non-empty `custom_filters` must not be mixed with non-empty authoring `dependencies`; conflicting input is rejected rather than losing saved conditions or native UI metadata. For an unchanged saved formula, preserve all returned native fields and omit `dependencies`. To intentionally reauthor it, supply a complete reviewed formula/dependency definition and remove conflicting native fields; do not claim this preserves arbitrary native metadata. A supported `format` and display metadata may be kept.

### Saved metrics as formula operands

An event-report formula can reference verified saved metrics directly, without expanding their event definitions. Use each metric's discovered `metric_name` in the dependency's `event` field; it is not a metric ID or a numbered report measure. The compiler resolves the visible metric and preserves its calculation definition. Write only bare aliases in the expression:

```json
{
  "time_range": {"mode":"previous","unit":"day","value":7},
  "metrics": [{
    "formula":"third / total",
    "dependencies":[
      {"alias":"third","event":"<verified_third_party_metric_name>"},
      {"alias":"total","event":"<verified_total_metric_name>"}
    ]
  }]
}
```

Replace placeholders with confirmed metric names from the current project. Omit `aggregation`, `property`, and `percentile` for saved-metric operands: the metric already owns these choices. Do not add dummy `total_count` or `sum` to satisfy a validation error. A mixed formula may combine this saved-metric shape with an ordinary event dependency that supplies its real aggregation and required property/percentile. Missing, inaccessible, or ambiguous metadata must follow compiler guidance; do not silently replace a saved metric with an event or inline a different calculation.

A saved metric's own filters belong to its calculation; this is different from adding new `filters` to a saved-metric dependency, which remains unsupported. When creating a filtered metric for later formula reuse, follow [`metric_create.md`](../metric_create.md#saved-metric-filters) and verify its saved conditions with `analysis-meta metric get`. Reuse that verified metric by name without expanding or stripping its definition. To divide filtered replies by all replies, keep the filtered metric only in the numerator and use an independently verified unfiltered metric or event in the denominator; moving its conditions to the formula's common filters changes both sides.

This is a formula inside an event analysis/report, not `analysis-meta metric create`, and it does not imply saved-metric dependency support for retention or other models. Existing saved-formula round-trip rules below still apply.

Saved formula report round-trip rules:

- `analysis report get` can return saved formula metrics with `custom_filters`, `formulation`, `custom_event_desc`, `event_desc`, `format`, `event_type`, `event_split_indexes`, `quota_time_ranges`, `quota_entities`, and `event_uuid`. These are saved-report round-trip fields, not the authoring shape for a new formula.
- When updating an existing report from its returned `definition`, preserve all of those fields unchanged unless the user explicitly requests that formula behavior to change. `custom_filters[*].index` binds each numerator/denominator occurrence to its own filter set, including repeated event/aggregation tokens.
- For a display-name-only change, modify only `display_name`. Do not convert the saved formula to `formula + dependencies`; reauthoring is a different operation and cannot preserve arbitrary native metadata automatically. Mixed representations are rejected as described above.
- Continue to use the `formula + dependencies` shape above when authoring a new formula metric.

Saved report filter round-trip rules:

- `analysis report get` can return historical recursive filter groups in report-level or metric-level `filters`. A group is `{"relation":"and|or","items":[...]}`; `items` may contain leaf filters or nested groups. Preserve this tree on read.
- Follow the shared saved-report boundary in [`../ai_models.md`](../ai_models.md): never flatten a deeper historical tree or keep only its last leaf. For a page-compatible tree, change only the requested leaf and retain all surrounding `relation` and `items` nodes before validating the complete definition.

## Aggregation

- `event`: without property use `total_count`, `user_count`, or `per_user_count`; numeric properties support `sum`, `avg`, `avg_per_user`, `max`, `min`, `distinct_count`, `median`, `percentile`, `variance`, and `stddev`; string/date/datetime properties support `distinct_count`; boolean properties support `true_count`, `false_count`, `not_empty_count`, `empty_count`, and `distinct_count`.

## Event totals and comparison columns

Pair `rows[i]` with `row_metadata[i]`. A row with `scope=total` and `total_query=true` is a total-query row; it need not have `period_values`. A day-grain stage row has `scope=total`; its `period_values` contains aggregation labels in metric order, such as `["dist", "sum"]`, not numbers. Read the numeric totals from the corresponding `rows[i]` cells: `dist` marks an independent period distinct count, `sum` marks a sum. `Overview` is localized display text, not a stable row identifier. Date rows have `drilldown_date`.

With time comparison, titles and values contain a main-period block followed by each comparison block: time column, then the same metric titles again (group columns, if present, come first). Preserve column indexes and block identity; turning repeated titles into object keys loses a period. The stage row contains a total per metric per block, while date rows contain the paired daily values. Use each block's actual date columns; row metadata alone does not describe every comparison date. Missing metadata, truncated rows, or an unexpected aggregate leaves that total unverified; inspect the saved structure before choosing an additional query.
