# system query-task list

Use when the user needs historical query logs within a mandatory bounded time range. For the realtime monitoring tab, use `ae-cli system query-task realtime-list` instead.

Do not use it outside the system query-task operation or with fields absent from the inspected capability schema.

Command:

```bash
ae-cli system query-task list --company-id <company_id> --start-time '2026-07-24 00:00:00' --end-time '2026-07-24 23:59:59' --status-codes '[4]' --content-codes '[101]' --task-type-codes '[6]' --project-ids '[123]'
```

Capability id: `system.query_task.list`.

If the required filter mappings are unknown, call `ae-cli system query-task options --company-id <company_id>` once. Reuse verified mappings within the same company/project scope; do not guess filter codes or cluster names.

Project IDs and workspace codes must belong to `--company-id`; foreign-company values are rejected before querying. The global system-project ID `-1` cannot be selected as a company-scoped project.

The range filters query **completion time**, not the returned `start_time` (task initiation time). Both boundary seconds are inclusive, including milliseconds within the end second. A task started before the window can appear if it completed inside it. Compare list and export using the same completion-time window; do not reject rows solely because `start_time` is outside it. The range must not exceed 31 days.

The response uses `ok`, `data`, and `meta`. Treat empty `data` as success when `ok=true`; preserve `request_id` and `invocation_id` when present.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--company-id` | Yes | Company ID. |
| `--start-time` | Yes | Inclusive completion-time lower bound in `yyyy-MM-dd HH:mm:ss`. |
| `--end-time` | Yes | Inclusive completion-time upper bound, including the entire second, in `yyyy-MM-dd HH:mm:ss`. |
| `--project-ids` | Conditional | Non-empty project IDs or space codes are required. |
| `--space-codes` | Conditional | Non-empty space codes or project IDs are required. |
| `--status-codes` | Yes | Task status-code JSON array. |
| `--content-codes` | Yes | Query content-code JSON array. |
| `--task-type-codes` | Yes | Query task-type-code JSON array. |
| `--cluster-names` | No | Optional cluster-name JSON array. |
| `--limit` | No | Maximum returned tasks. Default: 100, max: 1000. |
| `--offset` | No | Zero-based result offset. |
| `--fields` | No | Optional snake_case result field projection JSON array. |
