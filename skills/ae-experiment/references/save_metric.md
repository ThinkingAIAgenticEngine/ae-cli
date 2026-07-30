# experiment metric save

Create or update a metric.

```bash
ae-cli experiment metric save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Metric save request JSON object.

Create mode requires metric identifiers and metric configuration. Modify mode uses `update=true`.

## Semantic Metric Contract

- Supply metric QP as `req.metricDefinition`.
- Never submit internal `metricConfig`, `calcType`, or an `Axxx` calculation code.
- Experiment metrics currently accept event definitions only.
- Supported aggregations:
  - Event-count (no property): `total_count`, `user_count`, `active_days`
  - Property-based (**`property` REQUIRED**): `sum`, `avg`, `max`, `distinct_count`

### Property rule (mandatory)

When `aggregation` is `sum`, `avg`, `max`, or `distinct_count`:

1. Resolve the event's available properties with Analysis metadata first
   (`ae-cli analysis-meta property list` / `get` for that event).
2. Pass one concrete available property name in `metricDefinition.property`.
3. Do **not** invent placeholder metrics without a property (for example
   `metric_avg_no_property_*`). Hermes rejects property aggregations with a blank
   or missing `property`.

When `aggregation` is `total_count`, `user_count`, or `active_days`, omit `property`.

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
    "property":"amount"
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

### Event-count example (no property)

```bash
ae-cli experiment metric save --project-id 1 --req '{"metricId":"purchase_users","metricName":"Purchase users","createType":"event","goalDirection":"up","metricDesc":"Unique purchasers","metricDefinition":{"type":"event","event":"purchase","aggregation":"user_count"}}'
```

Filters use the semantic `filters` tree with `relation=and|or` and items containing
`field`, `operator`, and `values`.
