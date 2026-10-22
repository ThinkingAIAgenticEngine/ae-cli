# metadata data-table get

> Capability id: `metadata.data_table.get` · Domain: `metadata`.

## Command

```bash
ae-cli metadata data-table get --project-id <project_id> --data-table-id <id>
ae-cli metadata data-table get --project-id <project_id> --data-table-id <id> --include-preview true
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--data-table-id` | Yes | Data table ID from `metadata data-table list`. |
| `--include-preview` | No | Include preview rows when true. |

Each call to this capability's Gateway `execute` endpoint consumes one unit of the member's natural-day quota when the user is identifiable and usage statistics are enabled. This includes metadata-only reads (`include_preview` omitted or false), previews of any table type, cache hits, repeated calls, and failures within `execute`, including schema errors or permission denials. The database engine does not affect counting. Gateway capability-discovery list/inspect and validate/dry-run endpoints do not count. `QUERY_DAILY_LIMIT_EXCEEDED` (HTTP 429) requires waiting until reset or contacting an administrator; a blocked call does not increase the used quota but remains eligible for failed-call usage auditing. `QUERY_QUOTA_UNAVAILABLE` fails explicitly. Usage persistence is asynchronous and best effort, so persisted usage-row totals need not equal quota counters. Do not change identities to bypass quota enforcement.

## Request Body

```json
{ "project_id": 1, "data_table_id": 42, "include_preview": true }
```
