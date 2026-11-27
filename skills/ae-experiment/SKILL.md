---
name: ae-experiment
version: 1.0.14
description: "Use when managing Atlas AB or external experiments, experiment approvals and approvers, traffic domains and layers, Features, metrics, buckets, and experiment reports through ae-cli"
---

# ae-experiment

AE CLI (`ae-cli`) exposes Atlas AB Experiment capabilities through the `experiment` domain.

## Global Rules

- Prefer `ae-cli experiment <command>` for Atlas AB Experiment work.
- Use `--project-id` / `-p` for project-scoped commands.
- Use `--req` JSON for complex save, status, and delete DTOs.
- Do not invent experiment IDs, traffic domain IDs, traffic layer IDs, bucket IDs, Feature keys, metric IDs, or payload field names.
- Bind only metric IDs returned by `experiment metric list`; create and verify a missing metric before saving the experiment.
- Read commands can run directly after IDs are verified.
- Write commands require user intent. Only `high-risk-write` commands (including domain deletion) prompt for confirmation; use `--yes` only after authorization. Use `--dry-run` before write calls when composing JSON.

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
- Metric save supports event, formula, retention, and funnel definitions. Check
  `experiment.metric.save` in the target server's capability schema and use the
  [metric save contract](references/save_metric.md) to compose the request.
- Event-property comparisons belong in `metricDefinition.filters`, using
  `{relation,items:[{field,operator,values}]}`. Never put comparison fields directly on
  `metricDefinition`, and never submit raw `filts`, `calcuSymbol`, or `ftv` fields.
- For metric aggregations `sum` / `avg` / `max` / `distinct_count`, `metricDefinition.property`
  is **required** and must be a concrete available event property from Analysis metadata.
  Never create property aggregations without `property` (for example `metric_avg_no_property_*`).
- Preset event aggregations `total_count` / `user_count` / `active_days` omit `property`.
- Experiment metric creation does not support `avg_per_user` / `A105`.
- Resolve event and property names with Analysis metadata before saving semantic definitions.
- Lists return `data.items` and `data.total`; detail commands return `data.item`.
- Readiness returns `data.readiness`; reports return `data.report`; save guides return `data.guide`; save dry-run validation returns `data.validation`; writes return `data.result`.
- Query cancellation returns `data.success`.

## Typical Workflow

1. Discover reusable assets:
   - `experiment bucket list`
   - `experiment traffic-domain list` for Space quotas, current versions and domain permissions
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
   Use `experiment experiment update-metrics` when replacing metric bindings or assigning guardrail roles.
4. For an external experiment, use `experiment external-experiment save-submit` instead.
   Updated servers submit external experiments without approval, regardless of
   the approver roster. They do not use Features, traffic layers, allocation,
   targeting, or experiment cycles. Skip the Feature readiness/conflict/submission
   steps and read experiment detail to verify the result. Older approval-capable
   servers may still queue review; read [server compatibility](references/experiment_approval.md#server-compatibility).
   On servers exposing `req.clearEndTime`, omitting `--end-time` on updates retains
   the saved deadline. Cancel it explicitly with `--clear-end-time true`; read
   [external deadline compatibility](references/save_submit_external_experiment.md#deadline-updates-and-server-compatibility)
   before changing a deadline on older servers.
5. For a Feature draft, check readiness with `experiment experiment ready-check`.
6. For a Feature on a non-mutex traffic layer, run `experiment experiment conflict-check` before submit (needs `feature_key_list` from context or `experiment get`).
7. Submit the saved Feature draft with `experiment experiment manage --target-status pending`.
   This submission path works on both older and approval-enabled servers.
   `experiment approval submit` is an alternative after verifying capability support;
   submit once, never through both commands. Before choosing approval commands,
   read [server compatibility](references/experiment_approval.md#server-compatibility).
   On updated servers, a non-empty project approver roster enables Feature
   approval; an empty roster submits directly using the existing manual or
   scheduled start. Read `experiment experiment get` after submission. When
   review is pending, read `experiment approval get` and process the exact
   `approval_id` only for the user-requested action. Approval can start a due
   Feature experiment; verify approval and runtime status independently.
   For a scheduled Feature start, save `startTime` (or use `--start-time`) before
   submission. Read [Feature timing](references/save_experiment.md#feature-timing).
   Use `experiment experiment manage` for existing lifecycle actions. Its
   `draft → pending` call uses the same server approval policy as other submission paths.
   To resume `paused` to `running`, call `manage` directly and verify the status
   with `get`; do not use the pre-launch `ready-check` as a resume prerequisite.
8. Query reports with `experiment report summary`, `experiment report sample-size`, and `experiment report metric-trend`.

If an experiment save returns `error_code: METRIC_NOT_FOUND`, list metrics for the same project. Create and verify the metric before retrying; never retry with another invented ID. Metric deletion returns `error_code: METRIC_IN_USE` while an active experiment binding exists.

## Parameter Conventions

- Experiment save payloads distinguish two allocation fields: experiment-level `req.allocation` (**integer only; no decimals**) and group-level `req.groups[].allocation` (**integer only; sum must equal `100` exactly**).
- Shared traffic uses `req.isExpSharing=1` with `req.trafficLayerId` and must not pass `req.layerType`.
- Exclusive traffic uses `req.isExpSharing=0` with `req.bucketId`. Set `req.layerType` to `remote` or `local`; omitted mode defaults to `remote`. Local routing does not support `#user_id`.
- Public experiment metric roles are `primary`, `secondary`, and `guardrail`. The internal `observation` role is currently unavailable for saves. Guardrail is a binding role; updating metrics replaces the full binding list.

```bash
ae-cli experiment experiment get --project-id 1 --exp-id exp_123
ae-cli experiment experiment save --project-id 1 --req '{"expName":"Demo"}' --dry-run
ae-cli experiment experiment save --project-id 1 --req '{"expName":"Local routing draft","isExpSharing":0,"layerType":"local","bucketId":"#account_id"}' --dry-run
ae-cli experiment metric save --project-id 1 --req '{"metricId":"payment_gold_sum","metricName":"Payment gold sum","createType":"event","goalDirection":"up","metricPurpose":"confidence_statistics","metricDesc":"Gold sum for payments above 10","format":"float2","metricDefinition":{"type":"event","event":"payment","aggregation":"sum","property":"gold","filters":{"relation":"and","items":[{"field":"gold","operator":"gt","values":[10]}]}}}' --dry-run
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

`experiment experiment save`, `experiment experiment update-metrics`, `experiment external-experiment save-submit`, `capability run experiment.experiment.save-submit`, `experiment experiment list`, `experiment experiment list-archived`, `experiment experiment get`, `experiment experiment ready-check`, `experiment experiment conflict-check`, `experiment experiment manage`, `experiment experiment update-group`, `experiment experiment batch-delete`, `experiment operation-log query`

Read [`manage_guardrail_metrics.md`](references/manage_guardrail_metrics.md) before assigning or replacing metric roles.

### External Experiment

`experiment external-experiment save-submit`

Read [`save_submit_external_experiment.md`](references/save_submit_external_experiment.md) before creating or updating an external experiment.

### Experiment Approval and Approvers

`experiment approval get`, `experiment approval submit`, `experiment approval approve`,
`experiment approval reject`, `experiment approval withdraw`, `experiment approver list`,
`experiment approver add`, `experiment approver delete`

Read [`experiment_approval.md`](references/experiment_approval.md) for the approval workflow,
exact round IDs, proposed versus effective configuration, and the separate experiment approver list.
Approver list requires experiment settings view permission (`experimentViewSetting`);
approver add/delete require experiment settings edit permission (`experimentEditSetting`).
Approval actions use the separate experiment permissions described in the reference.
On updated servers, only Feature experiments with a non-empty approver roster
queue delivery changes for approval; a save returning `true` does not prove
the change is effective. Read experiment detail and any pending proposal.
Removing the last approver preserves existing pending reviews; withdraw and
resubmit when authorized. Adding approvers does not require retrospective
approval of effective configurations. Ineligible members do not make a
non-empty roster empty, and a failed roster read never proves approval is off.

### Traffic Domains

`experiment traffic-domain list`, `experiment traffic-domain create`, `experiment traffic-domain update`, `experiment traffic-domain delete`

Read [`manage_traffic_domains.md`](references/manage_traffic_domains.md) before quota changes,
deletion, or binding domains to traffic layers and exclusive experiments. Domain quotas use
integer basis points (10000 = 100%) and current Space `allocation_version`. Do not auto-refresh
and retry a rejected write. Domain commands use typed flags and snake_case allocation rows.
List, create and delete return Space snapshots in `data.items`; `data.total` counts Spaces.
Update returns Boolean `data.result`; list again to obtain the new version.

### Traffic Layer and Buckets

`experiment traffic-layer save`, `experiment traffic-layer get`, `experiment traffic-layer list`, `experiment traffic-layer batch-delete`, `experiment bucket list`

### Reports

`experiment report summary`, `experiment report sample-size`, `experiment report metric-trend`, `capability run experiment.query.cancel`

### Metric and Feature

`experiment metric save`, `experiment metric get`, `experiment metric list`, `experiment metric delete`, `experiment feature save`, `experiment feature update-status`, `experiment feature get`, `experiment feature list`, `experiment feature version-list`, `experiment feature operation-log query`, `experiment feature batch-delete`, `experiment feature whitelist list`, `experiment feature whitelist save`, `experiment feature whitelist update-status`, `experiment feature whitelist batch-delete`

`experiment feature update-fixed-value`, `experiment feature reset-fixed-value`

To configure fixed values when creating a Feature, read [`save_feature.md`](references/save_feature.md).
For existing Features, read [`manage_feature_fixed_value.md`](references/manage_feature_fixed_value.md)
before using the toggle or reset commands. Both commands require confirmation. Reset request IDs are
for tracing only, and repeating a request clears results again. Existing Feature list/get output
includes `fixed_value_enabled`.

Read [`manage_feature_whitelist.md`](references/manage_feature_whitelist.md) before querying or changing Feature whitelist rules.
