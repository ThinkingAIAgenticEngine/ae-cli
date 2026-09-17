# analysis-governance asset export

Use when the user needs the complete asset usage governance result as an asynchronous JSONL artifact.

Do not use it for a small interactive preview; use `asset list` when bounded inline rows are sufficient.

Command:

```bash
ae-cli analysis-governance asset export --project-id <project_id>
```

Capability id: governance.asset.export.

Input sends project_id, query, searchs, rule, operation_type, limit, offset. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is an async export descriptor with `run_id`, `artifact_id`, status, and expiry fields. Inspect and download that exact artifact rather than resubmitting the export.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --query | No | Keyword filter. |
| --searchs | No | Quick filter JSON array. |
| --rule | No | Advanced governance Filter JSON. |
| --operation-type | No | Batch operation type filter. |
| --limit | No | Inline page size. |
| --offset | No | Zero-based page offset. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |
