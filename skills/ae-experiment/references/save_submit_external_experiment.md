# experiment external-experiment save-submit

Create or update and submit an external experiment. This is the typed L2 wrapper for
`experiment.experiment.save-submit`; it always sends `expType: "external"`.

```bash
ae-cli experiment external-experiment save-submit \
  --project-id 1 \
  --exp-name "Partner onboarding test" \
  --bucket-id "#user_id" \
  --start-time "2026-09-01T00:00:00+08:00" \
  --end-time "2026-09-15T00:00:00+08:00" \
  --supposition "The new onboarding improves activation." \
  --groups '[{"expGroupName":"control","isControl":1},{"expGroupName":"variant","isControl":0}]' \
  --metrics '[{"metricId":"activation_rate","metricRole":"primary"}]' \
  --dry-run
```

`--dry-run` validates the external submit shape without persisting: required
time bounds, Feature-only fields that are forbidden here, group shape, and
primary metric presence. The final submit also checks that metric IDs exist and
that each metric event supports the selected bucket property.

External experiments are evaluated from exposure events reported by the caller. They
do not configure Features, traffic layers, allocation, targeting, or `expCycle`.
Choose an existing `bucket_id` whose property is available in the events used by every
bound metric. The server requires at least two named groups, exactly one control group,
and at least one existing primary metric.

Status is calculated from the submitted time range: a future start time becomes
`pending`, a current range becomes `running`, and an elapsed end time becomes `ended`.
No `end_time` creates a long-running experiment. When the scheduled job is active, a
pending experiment enters `running` at its start time and a running experiment enters
`ended` at its end time. `experiment experiment manage` permits only
`pending → running`, `running → ended`, and `ended → archive`; manually entering
`running` or `ended` replaces the corresponding time boundary with the current time.

For an update, first call `experiment experiment get`. An already submitted external
experiment can be updated only while `pending` or `running`; its hypothesis and time
range may change, and group descriptions may change. Keep its name, business group,
description, bucket, metric bindings, group count, group names, control markers,
allocations, and group values unchanged. Include every returned group unchanged,
including its `expGroupId`, `allocation`, and `expGroupValue`; the CLI rejects an
update that omits a group ID. Omitting `--end-time` represents a long-running
experiment, so preserve the current end time whenever it should remain scheduled.

Transition status: L2
Owning module: Hermes Atlas experiment capability gateway
Current transport: Capability Gateway `experiment.experiment.save-submit`
Gateway target: `experiment.experiment.save-submit`
Review after: 2027-02-28
Exit condition: Remove this wrapper if the Gateway exposes a dedicated external-experiment capability or the typed fields no longer match the Atlas external-experiment contract.
