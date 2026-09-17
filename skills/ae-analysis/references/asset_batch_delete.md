# analysis-governance asset batch-delete

Use when the user needs to batch delete governed assets through the capability gateway.

Do not use it for a single unverified name or as cleanup after a failed test; resolve exact `node_ids`, dry-run the final set, and require explicit confirmation.

Command:

```bash
ae-cli analysis-governance asset batch-delete --project-id <project_id> --node-ids '["<node_id>"]' --dry-run
# Summarize the target and impact, then wait for explicit user confirmation.
ae-cli analysis-governance asset batch-delete --project-id <project_id> --node-ids '["<node_id>"]' --yes
```

Capability id: governance.asset.batch_delete.

Input sends project_id, node_ids. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the batch-operation submission result. Preserve any returned record identity/status and use `operation-record list` to verify completion.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-ids | No | Asset node ID JSON array; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
