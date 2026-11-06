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

On approval-enabled servers, first submission and actual delivery changes enter
approval. Follow [server compatibility](experiment_approval.md#server-compatibility)
before reading `experiment approval get` after saving. On older servers, retain
this save-submit call and verify runtime detail without calling approval endpoints.
A successful submit is not evidence
that the experiment is running; do not submit it again with `approval submit`.

Once submitted configuration is effective, status is calculated from its time range: a future start time becomes
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
update that omits a group ID.

## Deadline updates and server compatibility

Before changing a deadline, inspect `experiment.experiment.save-submit` and check
`input_schema.properties.req.properties.clearEndTime`:

```bash
ae-cli capability inspect experiment.experiment.save-submit
```

On servers exposing `req.clearEndTime`:

- Creating an experiment without `--end-time` creates a long-running experiment.
- Updating an experiment without `--end-time` preserves its saved deadline.
  Native `req.endTime=null` also preserves it; neither expresses cancellation.
- Use `--clear-end-time true` with `--exp-id` to cancel a saved deadline. Do not
  combine it with `--end-time`. `--clear-end-time false` sends no clear field.
- On approval-enabled servers, cancelling a submitted experiment's deadline
  queues approval. The effective deadline remains until approval; rejection or
  withdrawal keeps it, and the historical proposal remains unchanged.

For an existing experiment, reuse its verified name, bucket, start, complete
groups and metric bindings when constructing the cancellation request:

Copy the saved start timestamp verbatim, including seconds and milliseconds;
do not round it in the client. The matching backend preserves an unchanged saved
start through submission and approval. Only new or actually changed start times
round up to a half-hour boundary. An unchanged update must not create an approval
merely because a manually recorded start is not aligned to that boundary.

```bash
ae-cli experiment external-experiment save-submit \
  --project-id <verified-project-id> --exp-id <verified-exp-id> \
  --exp-name '<current-name>' --bucket-id '<current-bucket-id>' \
  --start-time '<current-start-time-with-offset>' \
  --groups '<complete-current-groups-json>' --metrics '<current-metric-bindings-json>' \
  --clear-end-time true --dry-run
```

After submitting the selected change, read both approval and experiment detail;
do not report the deadline as cancelled while the proposal is pending.

Older servers without this field may still clear a deadline when `endTime` is
omitted or null. Pass the saved `--end-time` to retain it across server versions.
Explicit cancellation with `--clear-end-time` requires an upgraded backend;
schema rejection never authorizes an automatic retry without the clear flag or
through direct REST. If metadata omits the field while deployed backend behavior
is uncertain, resolve the contract before writing.

Transition status: L2
Owning module: Hermes Atlas experiment capability gateway
Current transport: Capability Gateway `experiment.experiment.save-submit`
Gateway target: `experiment.experiment.save-submit`
Review after: 2027-02-28
Exit condition: Remove this wrapper if the Gateway exposes a dedicated external-experiment capability or the typed fields no longer match the Atlas external-experiment contract.
