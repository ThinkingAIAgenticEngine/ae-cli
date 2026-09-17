# analysis-governance asset batch-disable-auto-update

Use when the user needs to batch disable auto update for assets through the capability gateway.

Do not use it to disable backups or freeze dashboard schedules; this operation only changes automatic update behavior for selected nodes.

Command:

```bash
ae-cli analysis-governance asset batch-disable-auto-update --project-id <project_id> --node-ids '["<node_id>"]'
```

Capability id: governance.asset.batch_disable_auto_update.

Input sends project_id, node_ids, refresh_type. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the batch-operation submission result. Follow the returned record/status through `operation-record list` instead of repeating the command.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --node-ids | No | Asset node ID JSON array; required unless provided inside payload. |
| --refresh-type | No | Dashboard refresh type: 1 enabled, 0 disabled. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
