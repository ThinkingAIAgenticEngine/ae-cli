# analysis-governance asset batch-disable-auto-backup

Use when the user needs to batch disable auto backup for assets through the capability gateway.

Do not use it to disable auto updates; this command disables backup behavior and optionally clears tag history for selected nodes.

Command:

```bash
ae-cli analysis-governance asset batch-disable-auto-backup --project-id <project_id> --node-ids '["<node_id>"]'
```

Capability id: governance.asset.batch_disable_auto_backup.

Input sends project_id, node_ids, clear_history_tag. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the batch-operation submission result. Preserve its record/status so the operation can be audited without resubmission.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-ids | No | Asset node ID JSON array; required unless provided inside payload. |
| --clear-history-tag | No | Whether to clear tag history: 1 yes, 0 no. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
