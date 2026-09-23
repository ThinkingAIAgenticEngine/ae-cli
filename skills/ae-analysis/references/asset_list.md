# analysis-governance asset list

Use when the user needs to list assets for usage governance through the capability gateway.

Do not use it for report/dashboard result data or lineage; it lists governance rows that can be filtered or selected for later asset operations.

Command:

```bash
ae-cli analysis-governance asset list --project-id <project_id>
```

Capability id: governance.asset.list.

Input sends project_id, query, searchs, rule, operation_type, limit, offset. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` contains `items`, `total`, `operation_types`, `limit`, and `offset`. An empty `items` array is a successful page with no matching governed assets.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-id | No | Restrict to a selected asset node. |
| --query | No | Keyword filter. |
| --searchs | No | Quick filter JSON array. |
| --rule | No | Advanced governance Filter JSON. |
| --operation-type | No | Batch operation type filter. |
| --limit | No | Inline page size. |
| --offset | No | Zero-based page offset. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
