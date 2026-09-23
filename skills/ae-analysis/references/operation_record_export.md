# analysis-governance operation-record export

Use when the user needs to export one asset batch operation record result through the capability gateway.

Do not use it to list records or export asset rows; resolve one real `record_id` first, then export that operation's result as XLSX.

Command:

```bash
ae-cli analysis-governance operation-record export --project-id <project_id> --record-id <record_id>
```

Capability id: governance.operation_record.export.

Input sends project_id, record_id. The CLI merges the snake_case object from `--payload` into these top-level Gateway fields; explicit flags override matching payload fields. `--project-id` owns the project identity and cannot be supplied or overridden by payload. Required business fields must exist in the final merged input.

Output `data` is an async XLSX descriptor with `run_id`, `artifact_id`, status, and expiry fields. Inspect and download that exact export.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| --project-id | Yes | Numeric project ID. |
| --record-id | No | Operation record ID; required unless provided inside payload. |
| --payload | No | Optional JSON object merged into top-level input. Use schema-declared snake_case fields; explicit flags take precedence. `node_ids`, `searchs`, and `status` are arrays; `rule` is an object when supplied. |

## Asynchronous export

This capability starts an asynchronous artifact export. Use `--wait --output <path>` to wait and download, or keep the returned `run_id` for query status and cancellation. `--force` allows overwriting the selected local output file.

- `--artifact-format xlsx` selects the logical data format. Follow the returned descriptor for compression and content type.
- `--request-id cli_<32 lowercase hex>` assigns a stable request identifier.
- `--timeout-seconds` accepts 1–7200 (server default: 3600).
- `--wait-timeout-seconds` controls how long this CLI invocation waits; it does not change the server runtime limit.
- Explicit flags override corresponding `--payload` fields; omitted options preserve payload values.
