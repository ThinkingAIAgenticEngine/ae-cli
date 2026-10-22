# metadata data-table download

> Capability id: `metadata.data_table.download` · Domain: `metadata`.

```bash
ae-cli metadata data-table download --project-id <project_id> --data-table-id <id>
ae-cli metadata data-table download --project-id <project_id> --data-table-id <id> --request-id cli_0123456789abcdef0123456789abcdef --timeout-seconds 120
ae-cli metadata data-table download --project-id <project_id> --data-table-id <id> --output <file>
```

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--data-table-id` | Yes | Data table ID. |
| `--request-id` | No | Optional `cli_<32 lowercase hex>` request ID. |
| `--timeout-seconds` | No | Omit to use the server default (normally 21600 seconds / 6 hours). This CLI accepts explicit values in `1..21600`. Inspect this capability for the server default/max; use `capability run` with `timeout_seconds` for larger values only when its schema allows them. |
| `--wait` | No | Wait for run `SUCCEEDED` and artifact `COMPLETED`. |
| `--output` | No | Wait, then stream and atomically publish the artifact to this file. |
| `--force` | No | Replace an existing `--output` file atomically; invalid without `--output`. |

Use this command when the user needs an exported data-table artifact. Plain
invocation submits only. `--output` implies `--wait`; resume an interrupted
wait with `ae-cli analysis run wait --run-id <run_id> [--output <file>]`.
Local interruption never cancels the remote run. Do not use this command for
inline data-table metadata; use `metadata data-table get` instead.

Read the returned `effective_timeout_seconds`, `timeout_source`, and `deadline_at` for the actual lifecycle deadline. Local waiting has its own bound and can be resumed without resubmitting.

Each Gateway `execute` call consumes one unit of the member's natural-day quota when the user is identifiable and usage statistics are enabled, regardless of database engine or business purpose. Cache hits and failures within `execute` count, including invalid input schemas, permission denials, unknown capability IDs, and accepted work that later fails or times out. Repeating the same input counts again even if a handler reuses an existing run; Gateway has no general `client_request_id` idempotency guarantee. Resume with `analysis run wait` or use `analysis artifact download`: their separate status/download HTTP endpoints do not count. Gateway capability discovery (list/inspect) and validate/dry-run do not count either. Pagination and cancellation do count when invoked through capability execution, such as `analysis.query.cancel`.

`QUERY_DAILY_LIMIT_EXCEEDED` (HTTP 429) requires waiting until reset or contacting an administrator; a blocked call does not increase the used quota but remains eligible for failed-call usage auditing. `QUERY_QUOTA_UNAVAILABLE` fails explicitly. Usage persistence is asynchronous and best effort, so persisted usage-row totals need not equal quota counters. Do not switch identities to bypass quota enforcement.
