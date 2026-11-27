# experiment metric save

Create or update a metric.

```bash
ae-cli experiment metric save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Metric save request JSON object (**camelCase** keys such as `metricId`, `metricDefinition`).

Create mode requires metric identifiers and metric configuration. Modify mode uses `update=true`.

For event metrics using `user_count`, `total_count`, or `active_days`, the
dedicated CLI save and `save validate --operation-mode save_metric` commands
default omitted create fields to `metricPurpose: "confidence_statistics"` and
`format: "integer"`. Explicit values take precedence. For updates, omitted
fields are left out of the request. Send both fields explicitly when calling
the gateway directly or using an older CLI.

Do not paste `save build-guide` / `save validate` `example_args.req` keys (`metric_id`, …) into
`--req`. Those responses snake_case nested placeholders; final save requires camelCase.
See [`save_build_guide.md`](save_build_guide.md) / [`save_validate.md`](save_validate.md).

## Semantic Metric Contract

- Supply metric QP as `req.metricDefinition`.
- To set a display format, pass `req.format` alongside `req.metricDefinition`. Use `integer` for counts, `float2` for two decimal places, or `percent` for rates. Provide it explicitly when creating metrics outside the defaults above. When updating, omit it to keep the saved format.
- Never submit internal `metricConfig`, `calcType`, or an `Axxx` calculation code.
- Set `metricDefinition.type` to `event`, `formula`, `retention`, or `funnel` as supported by the target server's `experiment.metric.save` schema. Formula uses `createType: "event"`. Event definitions accept optional `display_name`.
- On updates, read the existing metric first and keep its saved `createType`. Event and formula share the event type. To switch between event, retention, and funnel, create a separate metric.
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

### Formula, retention, and funnel definitions

Inspect `input_schema.properties.req.properties.metricDefinition` on the target server for the full schema. Use camelCase for the fields of `req` and keep the schema's field names inside `metricDefinition`.

| Definition type | Key fields |
| --- | --- |
| `formula` | `expression` uses the bare keys of its event `dependencies`. Each dependency needs a unique `key`. |
| `retention` | Set `analysis_subject`, `initial_event`, `return_event`, `time_granularity`, `retention_type`, and `display_mode`. Use `metricPurpose: "observation"` for retention count, churn count, and simultaneous display. |
| `funnel` | Set `analysis_subject`, at least two ordered `steps`, `relation_property`, and a `window` with `value` and `unit`. |

### Preset event metric example (no property)

```bash
ae-cli experiment metric save --project-id 1 --req '{"metricId":"payment_users","metricName":"Payment users","createType":"event","goalDirection":"up","metricPurpose":"confidence_statistics","metricDesc":"Users who triggered payment","format":"integer","metricDefinition":{"type":"event","event":"payment","aggregation":"user_count"}}'
```

### Correct example (avg with property)

```bash
ae-cli experiment metric save --project-id 1 --req '{
  "metricId":"startup_style_payment_avg_20260729",
  "metricName":"Startup style payment avg",
  "createType":"event",
  "goalDirection":"up",
  "metricPurpose":"confidence_statistics",
  "metricDesc":"Average payment amount",
  "format":"float2",
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

### Change the display format only

```bash
ae-cli experiment metric save --project-id 1 --req '{"metricId":"payment_users","update":true,"format":"integer"}'
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
