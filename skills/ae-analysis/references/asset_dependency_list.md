# analysis-governance asset-dependency list

Use when the user needs to list upstream dependencies for one asset through the capability gateway.

Do not use it for downstream impact or a full lineage tree; this command pages direct upstream dependencies for one resolved asset node.

Command:

```bash
ae-cli analysis-governance asset-dependency list --project-id <project_id> --node-id <node_id>
```

Capability id: governance.asset_dependency.list.

Input sends project_id, node_id, query, searchs, rule, limit, offset. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` contains dependency `items`, `total`, `operation_types`, `limit`, and `offset`; continue paging only while the observed total exceeds the current page.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-id | No | Poseidon asset node ID; required unless provided inside payload. |
| --query | No | Keyword filter. |
| --searchs | No | Quick filter JSON array. |
| --rule | No | Advanced governance Filter JSON. |
| --limit | No | Inline page size. |
| --offset | No | Zero-based page offset. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
