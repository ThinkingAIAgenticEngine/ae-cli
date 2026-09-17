# analysis-governance operation-record list

Use when the user needs to list asset batch operation records through the capability gateway.

Do not use it to submit a new batch operation; use it to find and inspect records produced by prior asset governance actions.

Command:

```bash
ae-cli analysis-governance operation-record list --project-id <project_id>
```

Capability id: governance.operation_record.list.

Input sends project_id, type, status, query, sort_field, sort_order, limit, offset. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is the paged batch-operation record result. Use record status to distinguish submitted, running, successful, and failed work before taking another action.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --type | No | Batch operation type. |
| --status | No | Operation status JSON array. |
| --query | No | Keyword filter. |
| --sort-field | No | Sort field. |
| --sort-order | No | Sort order: asc or desc. |
| --limit | No | Inline page size. |
| --offset | No | Zero-based page offset. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
