# experiment experiment save

Progressively create or patch an experiment draft.

```bash
ae-cli experiment experiment save --project-id <id> --req '<json>' [--start-time <timestamp>] [--fixed-end-time <timestamp>]
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Experiment save request JSON object.
- `--start-time`: Optional Feature start timestamp in ISO-8601 format with timezone offset. Overrides `req.startTime`.
- `--fixed-end-time`: Optional Feature deadline in the same format. Sets `req.expCycle.cycleType=time` and overrides `req.expCycle.fixedEndTime`, preserving other supplied cycle fields. These timing flags are for Feature experiments; external experiments use `external-experiment save-submit`.

## Contract

- Call shape is top-level `projectId` plus a non-empty `req` object. In CLI form, `--project-id` supplies the top-level project ID.
- Capability input uses outer `project_id`; nested `req` fields remain native camelCase. Hermes overwrites `req.projectId` with the outer project ID.
- Never call this with `req=null`, `req={}`, or a modify payload containing only `expId`; those are terminal validation failures.
- On `valid=false`, do not retry the same payload. Fix the reported field(s) or ask the user for missing input.
- **Do not** paste `save build-guide` / `save validate` `example_args.req` keys into `--req`.
  Those responses snake_case nested placeholders (`exp_name`). Final save requires camelCase
  (`expName`, `expSupposition`, `trafficLayerId`, `featureKeyList`, `metrics[].metricId`, …).
  If unsure, run `ae-cli capability inspect experiment.experiment.save` and copy
  `input_schema.properties.req` field names. `save validate` may return `valid: true` for
  snake_case `req` and still fail here with `unknown field …`.

Response shape is `data.result`. Object keys inside the result are recursively snake_case. A create commonly returns the new experiment ID as `data.result`; a patch commonly returns `true`.

## Payload Type Contract

Nested payload fields must match the server DTO types, not just the visible CLI dry-run body shape.

| Field | Correct shape | Incorrect shape |
| --- | --- | --- |
| `featureKeyList` | `["payment_color"]` | `[{"featureKey":"payment_color"}]` |
| `allocation` | integer (e.g. `20`) | `20.5`, `33.33` |
| `groups[].allocation` | integer; all groups sum to `100` (e.g. `34+33+33`) | `33.33`, or sum `99`/`101` |
| `groups[].expGroupValue` | `"[\"green\"]"` | `["green"]` |
| `metrics` | `[{"metricId":"payment","metricRole":"primary"}]` | `["payment"]` |

- `featureKeyList` is an array of Feature key strings, not Feature objects. For feature experiments, pass one Feature key string.
- `allocation` (experiment-level) and `groups[].allocation` are validated at the CLI interface: **integers only, decimals rejected** (for example `33.33` fails before save).
- `groups[].allocation` rule: each value must be an **integer**, and the **sum of all group allocations must equal `100` exactly** (for example `34 + 33 + 33 = 100`, not `33 + 33 + 33 = 99` and not decimal thirds).
- `groups[].expGroupValue` is a JSON-encoded string of a string array. Pass a string whose content is a JSON array, not a native JSON array.
- `metrics` is an array of metric binding objects. Each object contains `metricId` and `metricRole`.
- Every `metricId` must come from `experiment metric list` for the same project. If save returns `error_code: METRIC_NOT_FOUND`, create the metric with `experiment metric save`, verify it, and then retry the experiment save.

## Modes

### Create Draft

Blank or missing `req.expId` creates a draft.

Required:
- `expName`

Optional while drafting:
- `expType` (blank defaults to `feature`)
- `groupId`
- `trafficLayerId`
- `allocation`
- `expSalt`
- `expSupposition`
- `expDesc`
- `isExpSharing`
- `bucketId`
- `expCycle`
- `startTime`
- `groups`
- `featureKeyList`
- `metrics`
- `targeting`

Success returns the created `expId`.

```bash
ae-cli experiment experiment save --project-id 1 --req '{"expName":"Homepage CTA draft"}'
```

### Patch Draft

Non-blank `req.expId` patches an existing draft by merging the request with current experiment detail.

Required:
- `expId`
- At least one changed field besides `expId`

Merge behavior:
- Omitted fields keep their current values.
- Non-null scalar/object fields replace current values.
- Non-empty `groups`, `featureKeyList`, `metrics`, and non-null `targeting` replace saved values.
- Empty lists are not a reliable clear operation. Do not use empty arrays to clear bindings unless the backend contract is confirmed separately.

Success returns `true`; continue using the input `expId`.

```bash
ae-cli experiment experiment save --project-id 1 --req '{"expId":"exp_123","allocation":20}'
```

## Field Notes

- `isExpSharing=1` uses a shared traffic layer from `experiment traffic-layer list`; pick a `trafficLayerId` whose available idle traffic can cover `allocation`.
- `isExpSharing=0` uses exclusive traffic with `bucketId`; select the bucket with `experiment bucket list`.
- `allocation` (experiment-level) is the experiment's share of the traffic layer. It is optional during draft construction, but before readiness it must be greater than `0` and no more than `100`. **Integer only** (for example `20`); decimals such as `20.5` are rejected at the CLI interface.
- `groups[].allocation` (group-level): **integer only; sum must equal `100` exactly**. Example for 3 groups: `34 + 33 + 33 = 100`. Decimals such as `33.33` are rejected at the CLI interface before save.
- `expCycle.cycleType` can be `day`, `sample`, or `time`; when `cycleType=day`, `dayNum` is `1..90`. `time` requires `fixedEndTime`. Blank cycle defaults to day + 30.
- Before readiness, `groups` must be non-empty, contain exactly one control group (`isControl=1`), group allocations must sum to exactly `100`, and each `expGroupValue` must be a non-empty JSON string array.
- Feature experiments must bind `featureKeyList` before readiness. `featureKeyList` contains Feature key strings, not Feature objects. The MCP currently supports one `featureKey` for feature experiments.
- Metrics use `metricRole=primary|secondary|guardrail`; the internal `observation` role is currently unavailable for saves. Before readiness at least one primary metric is required.
- `targeting` replaces the saved targeting object when provided.
- Custom audience QP must be supplied as the semantic object
  `targeting.definitionRequest`. Do not submit the internal `targeting.targetConfig`
  JSON or any `Cxx`/`Axxx` code. Resolve event and property names with Analysis
  metadata first.
- Avoid redundant adjacent `compound` groups with the same `relation`. Hermes
  safely flattens those groups when an Atlas experiment is saved or submitted so
  the generated cluster QP stays within the backend layer limit. Different
  relations are always preserved.

Semantic audience example:

```json
{
  "targeting": {
    "definitionRequest": {
      "type": "condition",
      "conditions": {
        "relation": "and",
        "items": [
          {"type": "user", "field": "country", "operator": "eq", "values": ["CN"]},
          {
            "type": "event",
            "event": "purchase",
            "operator": "gte",
            "value": 2,
            "aggregation": "sum",
            "property": "amount",
            "time_range": {"mode": "recent", "unit": "day", "value": 7}
          }
        ]
      }
    }
  }
}
```

## Feature Timing

Feature start time is optional. Use ISO-8601 timestamps with an explicit offset,
for example `2026-11-01T16:00:00+08:00`. Prefer minutes `00` or `30` to align
with the server's half-hour scheduling checks. The CLI forwards timestamps;
the server clears seconds and milliseconds on configured Feature start times.

Save timing on a new draft or patch an existing experiment:

```bash
ae-cli experiment experiment save --project-id 1 --req '{"expName":"Scheduled CTA"}' --start-time '2026-11-01T16:00:00+08:00' --fixed-end-time '2026-11-08T16:00:00+08:00' --dry-run
ae-cli experiment experiment save --project-id 1 --req '{"expId":"exp_123"}' --start-time '2026-11-01T16:00:00+08:00' --fixed-end-time '2026-11-08T16:00:00+08:00'
```

The second command produces the same native request as:

```json
{"expId":"exp_123","startTime":"2026-11-01T16:00:00+08:00","expCycle":{"cycleType":"time","fixedEndTime":"2026-11-08T16:00:00+08:00"}}
```

Saving does not submit or start the experiment. Complete the remaining Feature,
group, traffic, and metric configuration, check readiness, and check traffic
conflicts for a non-mutex layer before submitting:

```bash
ae-cli experiment experiment ready-check --project-id 1 --exp-id exp_123
ae-cli experiment experiment manage --project-id 1 --exp-id exp_123 --target-status pending
ae-cli experiment experiment get --project-id 1 --exp-id exp_123
```

Only submitted `pending` Feature experiments with a configured start time are
eligible for automatic start. A draft never starts automatically; a pending
experiment without a start time waits for manual start. The server checks every
half hour, so a successful submission is not evidence that the experiment is
already running. Verify `data.item.status`, `start_time`, and
`scheduled_start_error` with `get` (or `list`). An expired pending window remains
pending and reports an error; fix the timing instead of reporting a start.

Timing changes follow server lifecycle rules:

- Start time can change while draft or pending. Omission or `null` preserves a
  saved start time; neither clears it. After the first run, start time is locked.
- `day` ends after start plus `dayNum` times 24 hours. `time` uses the absolute
  `expCycle.fixedEndTime`, which must be later than start. The top-level `endTime`
  is the actual end time, not the Feature deadline configuration.
- Submitted end conditions must keep their cycle type and may only be extended.
  The server validates existing state and the effective time window.
- Manual `running` starts immediately. Read fresh detail first and disclose any
  `start_time_adjustment_required=true` to the user: an early start uses current
  server time, recalculates a day-based deadline, and keeps a fixed deadline.
  Do not add an extra confirmation field to the request.
- Pause/resume keeps the original start and deadline. Running and paused
  experiments are checked for expiry every half hour; deadlines between checks
  are handled by a subsequent check.

## Payload Examples

Patch a Feature binding. `featureKeyList` is a string array:

```bash
ae-cli experiment experiment save --project-id 2 --req '{"expId":"e024","featureKeyList":["payment_color"]}'
```

Patch groups. `expGroupValue` is a JSON-encoded string, not a native array. `groups[].allocation` must be integers that sum to exactly `100`:

```bash
ae-cli experiment experiment save --project-id 2 --req '{"expId":"e024","groups":[{"expGroupName":"control","isControl":1,"allocation":50,"expGroupValue":"[\"green\"]"},{"expGroupName":"variant","isControl":0,"allocation":50,"expGroupValue":"[\"red\"]"}]}'
```

Three-group even split example:

```bash
ae-cli experiment experiment save --project-id 2 --req '{"expId":"e024","groups":[{"expGroupName":"control","isControl":1,"allocation":34,"expGroupValue":"[\"A\"]"},{"expGroupName":"variant_b","isControl":0,"allocation":33,"expGroupValue":"[\"B\"]"},{"expGroupName":"variant_c","isControl":0,"allocation":33,"expGroupValue":"[\"C\"]"}]}'
```

Patch metrics. `metrics` is an object array:

```bash
ae-cli experiment experiment save --project-id 2 --req '{"expId":"e024","metrics":[{"metricId":"payment","metricRole":"primary"}]}'
```

## Timing Validation Errors

Atlas business time checks return `error.type=validation`, a specific code,
`error.details.field`, and a correction hint. Examples:

| Code | Field | Correction |
| --- | --- | --- |
| `EXPERIMENT_END_TIME_INVALID` | `req.expCycle.fixedEndTime` (related: `req.startTime`) | Make the deadline strictly later than the start; submission or start also requires an unexpired window. |
| `EXPERIMENT_END_TIME_REQUIRED` | `req.expCycle.fixedEndTime` | Supply a timestamp with timezone offset when `cycleType=time`. |

Fix the reported field before retrying. The error preserves `meta.invocation_id`
for investigation. These checks do not save the invalid configuration; use `get`
to verify the existing timing. Older backends may still return
`CAPABILITY_EXECUTION_FAILED`; changing CLI arguments cannot repair a missing
server-side exception translator.

## Dry-run Limitation

`--dry-run` calls the Capability Gateway preview endpoint. It validates the outer input contract but does not guarantee that every nested DTO business rule will pass execution.

If execution reports a DTO type mismatch after a clean dry-run, inspect nested field types first:

- `featureKeyList` must be a string array.
- `groups[].allocation` must be an integer, and all group allocations must sum to exactly `100`.
- `groups[].expGroupValue` must be a JSON-encoded string.
- `metrics` must be an object array with `metricId` and `metricRole`.

## Verified Related CLI Commands

Use only these confirmed ae-cli commands when composing or checking a save payload:

- `experiment experiment get`: optional; use only when patching an existing `expId` and you need to inspect saved fields.
- `experiment bucket list`: find `bucketId`.
- `experiment traffic-layer list`: find shared `trafficLayerId`.
- `experiment feature list`: find `featureKey`.
- `experiment metric list`: find `metricId`.
- `experiment traffic-layer save`: create a missing traffic layer.
- `experiment feature save`: create a missing Feature.
- `experiment metric save`: create a missing metric.
- `experiment experiment ready-check`: verify completeness before moving to `pending`, `testing`, or `running`.

## Completion

After a successful save, output the experiment detail link in this form, substituting the returned or input `expId` and actual project ID:

```markdown
[View experiment](/#/atlas/experiment/detail?expId=<expId>&currentProjectId=<projectId>)
```

After every successful save, call:

```bash
ae-cli experiment experiment ready-check --project-id <id> --exp-id <expId>
```

Use readiness failures to decide the next patch. Do not report the experiment save work as complete until readiness has been checked.
