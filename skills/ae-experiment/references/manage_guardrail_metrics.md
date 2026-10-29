# experiment experiment update-metrics

Replace the metric bindings of an existing experiment draft and assign metric roles, including
guardrail metrics.

```bash
ae-cli experiment experiment update-metrics \
  --project-id <id> \
  --exp-id <exp_id> \
  --metrics '[{"metricId":"conversion","metricRole":"primary"},{"metricId":"error_rate","metricRole":"guardrail"}]'
```

## Contract

- Discover every `metricId` with `experiment metric list`; never invent metric IDs.
- `--metrics` must be a non-empty array. Each item requires camelCase `metricId` and `metricRole`.
- `metricRole` is one of `primary`, `secondary`, or `guardrail`. Do not submit the internal
  `observation` role; Hermes currently rejects it at save boundaries.
- This command replaces all saved metric bindings because Hermes treats a non-empty `metrics` list
  in a draft patch as a replacement. Include bindings that must remain, not only the new guardrail.
- Guardrail is a binding role, not a separate metric type. Create the underlying metric first with
  `experiment metric save` when it does not exist.
- At least one `primary` metric is still required before readiness succeeds.

Run with `--dry-run` first, then verify the persisted roles with `experiment experiment get` and
run `experiment experiment ready-check`.
