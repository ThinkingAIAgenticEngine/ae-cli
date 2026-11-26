# experiment save build-guide

Build a read-only save guide for feature, traffic layer, experiment, or metric saves.

```bash
ae-cli experiment save build-guide --project-id <id> --operation-mode save_experiment
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--operation-mode`: `save_feature`, `save_traffic_layer`, `save_experiment`, or `save_metric`.

## CRITICAL — do not copy `example_args.req` keys verbatim

Guide responses are recursively snake_cased for display. That wrongly rewrites nested DTO
placeholders inside `data.guide.example_args.req` (for example `expName` → `exp_name`,
`metricId` → `metric_id`).

Those snake_case keys are **not** valid `--req` fields for the final save commands.

Authoritative field names:

| Mode | Inspect / final save | Nested `--req` style |
| --- | --- | --- |
| `save_experiment` | `experiment.experiment.save` | camelCase (`expName`, `trafficLayerId`, …) |
| `save_metric` | `experiment.metric.save` | camelCase (`metricId`, `metricDefinition`, …) |
| `save_feature` | `experiment.feature.save` | camelCase (`featureKey`, `targetPlatform`, …) |
| `save_traffic_layer` | `experiment.traffic-layer.save` | camelCase (`bucketId`, `layerName`, …) |

Before composing `--req`:

1. Read `data.guide.required_fields` / `mode_rules` for **what** is required (names there may
   already be camelCase).
2. Treat `example_args.req` as structure-only placeholders; **rename keys to camelCase**.
3. Prefer `ae-cli capability inspect <final-save-capability-id>` `input_schema.properties.req`
   when unsure.
4. Then run `experiment save validate` and the final `experiment … save`.

Response shape: `data.guide`.
