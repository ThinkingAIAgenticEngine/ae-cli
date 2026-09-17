# analysis-governance asset-query-history list

Use when the user needs to list query history for one asset through the capability gateway.

Do not use it to execute or inspect an analysis query; it only pages historical query usage associated with one governed asset.

Command:

```bash
ae-cli analysis-governance asset-query-history list --project-id <project_id> --node-id <node_id>
```

Capability id: governance.asset_query_history.list.

Input sends `project_id`, `node_id`, and optional `limit` and `offset`. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` contains query-history `items`, `total`, `operation_types`, `limit`, and `offset`; treat an empty history as a successful no-usage result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-id | No | Poseidon asset node ID; required unless provided inside payload. |
| --limit | No | Inline page size. |
| --offset | No | Zero-based page offset. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. Supported business fields are `node_id`, `limit`, and `offset`. |
