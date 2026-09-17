# analysis-governance asset-lineage get

Use when the user needs to get an asset lineage tree through the capability gateway.

Do not use it for a flat upstream or downstream page; use `asset-dependency list` or `asset-impact list` when pagination and filtering are required.

Command:

```bash
ae-cli analysis-governance asset-lineage get --project-id <project_id> --node-id <node_id>
```

Capability id: governance.asset_lineage.get.

Input sends project_id, node_id. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the lineage tree rooted at the requested `node_id`; an absent node is an asset-resolution failure, not an empty lineage result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-id | No | Poseidon asset node ID; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
