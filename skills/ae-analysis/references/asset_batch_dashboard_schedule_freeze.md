# analysis-governance asset batch-dashboard-schedule-freeze

Use when the user needs to batch freeze dashboard schedules for governed assets through the capability gateway.

Do not use it for non-dashboard assets or ordinary dashboard content edits; it changes schedule, cache, refresh, and freeze settings in one batch.

Command:

```bash
ae-cli analysis-governance asset batch-dashboard-schedule-freeze --project-id <project_id> --node-ids '["<node_id>"]'
```

Capability id: governance.asset.batch_dashboard_schedule_freeze.

Input sends `project_id`, `node_ids`, and optional `schedule_ui_config`, `dashboard_status`, `refresh_type`, and `cache_config`. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the dashboard batch-operation submission result. Verify its returned operation record before reporting the schedules as frozen.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-ids | No | Asset node ID JSON array; required unless provided inside payload. |
| --dashboard-status | No | Dashboard status: `freeze` or `normal`. |
| --schedule-ui-config | No | Dashboard schedule configuration as a JSON object or string. |
| --refresh-type | No | Dashboard refresh type: 1 enabled, 0 disabled. |
| --cache-config | No | Dashboard cache configuration as a JSON object or string. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids` is a non-empty string array; configuration fields accept objects or strings. |
