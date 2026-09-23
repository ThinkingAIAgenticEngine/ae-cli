# experiment metric save

Create or update a metric.

```bash
ae-cli experiment metric save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Metric save request JSON object (**camelCase** keys such as `metricId`, `metricDefinition`).

Create mode requires metric identifiers and metric configuration. Modify mode uses `update=true`.

Do not paste `save build-guide` / `save validate` `example_args.req` keys (`metric_id`, …) into
`--req`. Those responses snake_case nested placeholders; final save requires camelCase.
See [`save_build_guide.md`](save_build_guide.md) / [`save_validate.md`](save_validate.md).

## Semantic Metric Contract

- Supply metric QP as `req.metricDefinition`.
- Never submit internal `metricConfig`, `calcType`, or an `Axxx` calculation code.
- Experiment metrics currently accept event definitions only.
- Event-property comparisons belong in `metricDefinition.filters`. Each item uses
  `field`, `operator`, and `values`; do not place `operator` or `value` directly on
  `metricDefinition`.
- Supported aggregations:
  - Preset event metrics (omit `property`): `total_count`, `user_count`, `active_days`
  - Property-based (**`property` REQUIRED**): `sum`, `avg`, `max`, `distinct_count`
- `avg_per_user` (`A105`) is not supported for experiment metric creation.

### Property rule (mandatory)

When `aggregation` is `sum`, `avg`, `max`, or `distinct_count`:

1. Resolve the event's available properties with Analysis metadata first
   (`ae-cli analysis-meta property list` / `get` for that event).
2. Pass one concrete available property name in `metricDefinition.property`.
3. Do **not** invent placeholder metrics without a property (for example
   `metric_avg_no_property_*`). Hermes rejects property aggregations with a blank
   or missing `property`.

When `aggregation` is `total_count`, `user_count`, or `active_days`, omit `property`.

### Preset event metric example (no property)

```bash
ae-cli experiment metric save --project-id 1 --req '{"metricId":"payment_users","metricName":"Payment users","createType":"event","goalDirection":"up","metricDesc":"Users who triggered payment","metricDefinition":{"type":"event","event":"payment","aggregation":"user_count"}}'
```

### Correct example (avg with property)

```bash
ae-cli experiment metric save --project-id 1 --req '{
  "metricId":"startup_style_payment_avg_20260729",
  "metricName":"Startup style payment avg",
  "createType":"event",
  "goalDirection":"up",
  "metricDesc":"Average payment amount",
  "metricDefinition":{
    "type":"event",
    "event":"payment",
    "aggregation":"avg",
    "property":"amount",
    "filters":{
      "relation":"and",
      "items":[{"field":"amount","operator":"gt","values":[10]}]
    }
  }
}'
```

### Wrong example (avg without property — rejected)

```json
{
  "metricId": "metric_avg_no_property_actual_20260729_144230",
  "metricDefinition": {
    "type": "event",
    "event": "payment",
    "aggregation": "avg"
  }
}
```

Filters use the semantic `filters` tree with `relation=and|or` and items containing
`field`, `operator`, and `values`. For the frontend example `gold > 10`, use:

```json
{"filters":{"relation":"and","items":[{"field":"gold","operator":"gt","values":[10]}]}}
```
