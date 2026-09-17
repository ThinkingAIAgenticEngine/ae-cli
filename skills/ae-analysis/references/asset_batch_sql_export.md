# analysis-governance asset batch-sql-export

Use when the user needs to batch export asset SQL definitions through the capability gateway.

Do not use it for general asset information or query execution; it exports SQL definitions for verified asset `node_ids` as XLSX.

Command:

```bash
ae-cli analysis-governance asset batch-sql-export --project-id <project_id> --node-ids '["<node_id>"]'
```

Capability id: governance.asset.batch_export_sql.

Input sends `project_id` and `node_ids`. Optional `request_id`, `format` (only `xlsx`), and `timeout_seconds` (1..7200, default 3600) may be supplied through `--payload`. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is an async XLSX descriptor with `run_id`, `artifact_id`, status, and expiry fields. This command has no `--output` flag. Wait and download with `ae-cli analysis run wait --run-id <run_id> --output <file>` using the returned run ID; see [`run_wait.md`](run_wait.md).

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-ids | No | Asset node ID JSON array; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids` is a non-empty string array. Optional export fields are `request_id`, `format`, and `timeout_seconds`. |
