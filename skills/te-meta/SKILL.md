---
name: te-meta
version: 1.0.0
description: "TE metadata and tracking-plan governance: event/property management, metric creation and updates, batch metadata editing, virtual events/properties, project configuration and members, tracking plans (track program), milestones/date markers (mark time), and entity catalog. Triggered when users mention editing tracking, tracking dictionaries, event/property governance, building metrics, checking project config, maintaining track programs, or managing mark time."
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli te_meta --help"
---

# te-meta

> **CRITICAL - Before starting, MUST first read [`../te-shared/SKILL.md`](../te-shared/SKILL.md)**: authentication, host configuration, global parameters, and write-operation confirmation rules are all there.
> **CRITICAL - Before performing write operations, MUST first read [`../te-common/SKILL.md`](../te-common/SKILL.md)**: the unified post-operation constraints (resource-link completion after create/update) are defined there.
> **CRITICAL - For all commands that require `project_id`, MUST follow `te-common`'s `PROJECT_ID_GATE` (if missing, stop and confirm with the user).**
> **CRITICAL - Before running any `+<tool_name>` command, MUST first read the corresponding reference doc `./references/<tool-name>.md`**. For example: before running `+create_metric`, you must first read [`./references/create-metric.md`](./references/create-metric.md)

## When to Use

When the user needs "metadata governance and project configuration" capabilities, use `te-meta`:

- Event/property metadata queries: `+list_events`, `+list_properties`
- Metric and virtual metadata governance: metric / batch metadata / virtual event/property
- Project configuration: `+get_project_config`, `+list_project_users`
- Tracking plans and date markers: track program / mark time
- Entity catalog: `+list_entities`

## Command Format

`ae-cli te_meta +<tool_name> [options]`

## Tool Groups (20)

### Metadata and Governance (10)
- `+list_events` ([documentation](./references/list-events.md))
- `+list_properties` ([documentation](./references/list-properties.md))
- `+list_metrics` ([documentation](./references/list-metrics.md))
- `+get_metric` ([documentation](./references/get-metric.md))
- `+create_metric` ([documentation](./references/create-metric.md))
- `+update_metric` ([documentation](./references/update-metric.md))
- `+batch_edit_metadata` ([documentation](./references/batch-edit-metadata.md))
- `+batch_create_metadata` ([documentation](./references/batch-create-metadata.md))
- `+create_virtual_event` ([documentation](./references/create-virtual-event.md))
- `+create_virtual_property` ([documentation](./references/create-virtual-property.md))

### Project and Tracking (9)
- `+get_project_config` ([documentation](./references/get-project-config.md))
- `+list_project_users` ([documentation](./references/list-project-users.md))
- `+get_track_program` ([documentation](./references/get-track-program.md))
- `+save_track_items` ([documentation](./references/save-track-items.md))
- `+delete_track_items` ([documentation](./references/delete-track-items.md))
- `+create_project_mark_time` ([documentation](./references/create-project-mark-time.md))
- `+update_project_mark_time` ([documentation](./references/update-project-mark-time.md))
- `+list_project_mark_times` ([documentation](./references/list-project-mark-times.md))
- `+delete_project_mark_times` ([documentation](./references/delete-project-mark-times.md))

### Entity Catalog (1)
- `+list_entities` ([documentation](./references/list-entities.md))

## Quick Verification

```bash
ae-cli te_meta --help
npm run verify:te-meta-tools
# Example: use dry-run to preview the request (replace project_id with your actual project ID)
ae-cli te_meta +list_events --project_id <YOUR_PROJECT_ID> --dry-run
```

## Reference Docs

See the `references/` directory (20 per-command docs total).
