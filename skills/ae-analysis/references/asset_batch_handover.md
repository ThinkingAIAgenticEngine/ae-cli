# analysis-governance asset batch-handover

Use when the user needs to batch hand over governed assets to another user through the capability gateway.

Do not use it to share assets or modify permissions; it transfers ownership of verified nodes to one verified numeric user ID.

Command:

```bash
ae-cli analysis-governance asset batch-handover --project-id <project_id> --node-ids '["<node_id>"]' --to-user-id <user_id>
```

Capability id: governance.asset.batch_handover.

Input sends project_id, node_ids, to_user_id. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the ownership-transfer batch submission result. Confirm completion from its operation record rather than assuming submission equals handover.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-ids | No | Asset node ID JSON array; required unless provided inside payload. |
| --to-user-id | No | Target user ID; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
