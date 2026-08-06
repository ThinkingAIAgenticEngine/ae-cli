---
name: ae-experiment
version: 1.0.1
description: "Use when managing Atlas AB experiments, traffic layers, Features, metrics, buckets, and experiment reports through ae-cli"
---

# ae-experiment

AE CLI (`ae-cli`) exposes Atlas AB Experiment capabilities through the `experiment` domain.

## Global Rules

- Prefer `ae-cli experiment <command>` for Atlas AB Experiment work.
- Use `--project-id` / `-p` for project-scoped commands.
- Use `--req` JSON for complex save, status, and delete DTOs.
- Do not invent experiment IDs, traffic layer IDs, bucket IDs, Feature keys, metric IDs, or payload field names.
- Bind only metric IDs returned by `experiment metric list`; create and verify a missing metric before saving the experiment.
- Read commands can run directly after IDs are verified.
- Write commands require explicit user intent and normally keep the confirmation prompt. Use `--dry-run` before write calls when composing JSON.

Naming and response boundary:

- CLI command segments and flags use kebab-case.
- Outer Capability input and all response keys use snake_case.
- Nested business DTOs passed through `--req` keep their native camelCase fields.
- **CRITICAL:** `save build-guide` / `save validate` responses recursively snake_case
  `example_args.req`. Never copy those keys into `--req`. Use camelCase
  (`expName`, `metricId`, …). Authoritative names:
  `ae-cli capability inspect experiment.experiment.save` (or the matching final save id)
  → `input_schema.properties.req`. `save validate` `valid: true` is **not** a final-save
  schema pass — snake_case `req` can still fail on `experiment … save`.
- Audience QP is semantic at the CLI boundary: write `targeting.definitionRequest`; read
  `targeting.definition_request`. Never generate or submit `targetConfig`.
- Metric QP is semantic at the CLI boundary: write `metricDefinition`; read
  `metric_definition`. Never generate or submit `metricConfig`, `calcType`, or `Axxx` codes.
- For metric aggregations `sum` / `avg` / `max` / `distinct_count`, `metricDefinition.property`
  is **required** and must be a concrete available event property from Analysis metadata.
  Never create property aggregations without `property` (for example `metric_avg_no_property_*`).
- Event-count aggregations `total_count` / `user_count` / `active_days` omit `property`.
- Resolve event and property names with Analysis metadata before saving semantic definitions.
- Lists return `data.items` and `data.total`; detail commands return `data.item`.
- Readiness returns `data.readiness`; reports return `data.report`; save guides return `data.guide`; save dry-run validation returns `data.validation`; writes return `data.result`.
- Query cancellation returns `data.success`.

## Typical Workflow

1. Discover reusable assets:
   - `experiment bucket list`
   - `experiment traffic-layer list`
   - `experiment feature list`
   - `experiment metric list`
2. Create missing assets if needed:
   - `experiment save build-guide --operation-mode save_metric` when save validation fails or req shape is unclear
   - `experiment save validate --operation-mode save_metric --req '{...}'` before retrying a failed save
   - `experiment traffic-layer save`
   - `experiment feature save`
   - `experiment metric save`
3. Create or patch the experiment draft with `experiment experiment save`.
4. Check readiness with `experiment experiment ready-check`.
5. For a non-mutex traffic layer, run `experiment experiment conflict-check` before submit (needs `feature_key_list` from context or `experiment get`).
6. Move status with `experiment experiment manage`.
7. Query reports with `experiment report summary`, `experiment report sample-size`, and `experiment report metric-trend`.

If an experiment save returns `error_code: METRIC_NOT_FOUND`, list metrics for the same project. Create and verify the metric before retrying; never retry with another invented ID. Metric deletion returns `error_code: METRIC_IN_USE` while an active experiment binding exists.

## Parameter Conventions

- Experiment save payloads distinguish two allocation fields: experiment-level `req.allocation` (**integer only; no decimals**) and group-level `req.groups[].allocation` (**integer only; sum must equal `100` exactly**).

```bash
ae-cli experiment experiment get --project-id 1 --exp-id exp_123
ae-cli experiment experiment save --project-id 1 --req '{"expName":"Demo"}' --dry-run
ae-cli experiment metric save --project-id 1 --req '{"metricId":"login_users","metricName":"Login users","createType":"event","goalDirection":"up","metricDesc":"Users who logged in","metricDefinition":{"type":"event","event":"login","aggregation":"user_count"}}' --dry-run
ae-cli experiment report metric-trend --project-id 1 --exp-id exp_123 --metric-id metric_1 --start-time 2026-07-01 --end-time 2026-07-07
```

Optional global parameters work as in other domains: `--host`, `--mcp-url`, `--format`, `--jq`, `--dry-run`, and `--yes`.

## References

Open the matching file in `references/` before using a command, especially for write operations and JSON payloads.

### Save Helpers

`experiment save build-guide`, `experiment save validate`

When a save command returns `next_tool: experiment.save.build-guide`, call the guide first, then `experiment save validate`, then retry the final save capability.

Read [`save_build_guide.md`](references/save_build_guide.md) and
[`save_validate.md`](references/save_validate.md) before using these helpers. Rebuild
`--req` in camelCase from `inspect` / skill references; do not paste `example_args.req`.

### Experiment

`experiment experiment save`, `capability run experiment.experiment.save-submit`, `experiment experiment list`, `experiment experiment list-archived`, `experiment experiment get`, `experiment experiment ready-check`, `experiment experiment conflict-check`, `experiment experiment manage`, `experiment experiment update-group`, `experiment experiment batch-delete`, `experiment operation-log query`

### Traffic Layer and Buckets

`experiment traffic-layer save`, `experiment traffic-layer get`, `experiment traffic-layer list`, `experiment traffic-layer batch-delete`, `experiment bucket list`

### Reports

`experiment report summary`, `experiment report sample-size`, `experiment report metric-trend`, `capability run experiment.query.cancel`

### Metric and Feature

`experiment metric save`, `experiment metric get`, `experiment metric list`, `experiment metric delete`, `experiment feature save`, `experiment feature update-status`, `experiment feature get`, `experiment feature list`, `experiment feature version-list`, `experiment feature operation-log query`, `experiment feature batch-delete`
