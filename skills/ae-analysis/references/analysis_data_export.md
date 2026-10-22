# Analysis data exports

Read this after selecting an analysis data export. For a bounded query and local result reading, use [analysis_data_retrieval.md](analysis_data_retrieval.md).

Use the matching `export --output <file>` command for full, unknown-size, over-limit, long-running or timed-out query results.

Export commands are asynchronous artifact jobs and do not accept
`--preview-rows`. Native full-download paths retain their existing model/SQL total row
ceilings.

`--artifact-format` selects the logical row format, not compression. Read the returned `format`, `compression`, `file_name`, `content_type`, and `content_encoding`; analysis query exports are currently gzip-compressed even when the logical format is `jsonl` or `csv`.

Omit `--timeout-seconds` to use the server default (normally 21600 seconds / 6 hours). Common analysis-query and asset-governance exports use the deployment's async default, which may exceed 6 hours. The analysis-query typed flag still accepts explicit values only in `1..21600` (asset-governance typed flags retain `1..7200`); inspect the selected capability for the server default and maximum. If its schema allows a larger explicit value, use `capability run` with `timeout_seconds`. Other export families retain their own server policies; do not assume this deployment setting applies to every export.

Read `effective_timeout_seconds`, `timeout_source`, and `deadline_at` from the returned run descriptor for the actual deadline.

The member's natural-day quota counts each Gateway capability `execute` call eligible for usage statistics: the user is identifiable and statistics are enabled. Eligibility follows Gateway usage recording, regardless of business purpose or database engine (including MySQL and Trino). Report reads/saves, metadata reads, asset-governance exports, business data queries, cache hits, and failures that reach `execute` all count. This includes invalid input schemas, permission denials, unknown capability IDs, and accepted work that later fails or times out. A local CLI validation failure that never reaches Gateway `execute` does not count.

Each repeated `execute` call counts, even with identical input or when a handler reuses an existing run. Gateway provides no general `client_request_id` idempotency guarantee. Resume the existing run through its status/download endpoints instead of submitting it again. Gateway capability-discovery list/inspect endpoints, validate/dry-run endpoints, and independent run-status/artifact-download HTTP endpoints do not enter capability execution and do not count. This applies to `analysis run inspect`, `analysis run wait` polling, and `analysis artifact download`. Business `list`/`get` commands still count when they execute a capability; the operation's name does not change its route. Pagination, cancellation, or another operation invoked through capability execution does count; for example, both `analysis query cancel` and `capability run analysis.query.cancel` enter `execute`.

`QUERY_DAILY_LIMIT_EXCEEDED` (HTTP 429) requires waiting until reset or contacting an administrator. A call blocked at the daily limit does not increase the used quota, but remains eligible for failed-call usage auditing. `QUERY_QUOTA_UNAVAILABLE` means quota enforcement is unavailable and fails explicitly. Do not retry with another identity to bypass either error. Usage persistence is asynchronous and best effort: quota and usage recording share eligibility, but the quota counter need not equal the number of persisted usage rows.

Choose one lifecycle form:

```bash
# Submit only. Preserve the returned run_id/artifact_id.
ae-cli analysis adhoc export ...

# Submit, then wait through repeated short inspect requests.
ae-cli analysis adhoc export ... --wait

# Submit, wait, and stream the completed artifact to a local file.
ae-cli analysis adhoc export ... --output <file>

# Resume after interruption, client wait expiry, or a detached shell.
ae-cli analysis run wait --run-id <run_id> [--output <file>]
```

`--output` implies `--wait`. `--wait-timeout-seconds` controls only how long the
current CLI process remains attached; it defaults to 600 seconds and is capped
at 21600 seconds. The server lifecycle descriptor remains a hard upper bound
with a short artifact-materialization grace period. Ctrl-C, client wait expiry,
or a persistent transient network failure stops only local waiting; it never
cancels the remote run. Resume with the returned `resume_command` or printed
`analysis run wait` command.

A server run can outlive one local wait window. Resume the same run instead of submitting it again.

Waiting succeeds only for `status=SUCCEEDED` plus
`artifact_status=COMPLETED`. Run or artifact `FAILED`/`CANCELED` is terminal and
returns a non-zero error. Unknown states, authorization failures, and 404s fail
immediately instead of being polled indefinitely.

Downloads stream into a temporary file in the destination directory and publish
the complete file atomically. Existing output paths are refused by default; pass
`--force` only when replacement is intentional. The primitive commands remain
available for manual control:

```bash
ae-cli analysis run inspect --run-id <run_id>
ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file> [--force]
```

Cancel an async run/export with:

```bash
ae-cli analysis query cancel --run-id <run_id>
```

If `analysis run inspect`, `analysis run wait`, or `analysis artifact download` returns HTTP 404 for a valid `run_id` / `artifact_id` from the same export response, treat it as a backend route/capability deployment issue. Do not keep polling or invent download URLs.

If the current host returns `CAPABILITY_NOT_FOUND` for a documented command, treat it as host/backend capability unavailability. Do not retry with different JSON shapes or flags; choose another supported path only when it satisfies the user's request, otherwise report the backend gap.

Drilldown event/entity/user-event, ad-hoc/report/dashboard model, BI chart,
user tag/cluster member, and history-tag drilldown exports use Common's
full-download streaming paths. They accept no `limit`, `offset`, `page_num`, or
`page_size`, and remain bounded by the existing full-download ceiling. Do not
collect full data by repeated `list/run` calls.

User tag/cluster member and history-tag drilldown exports support both
`jsonl.gz` and `csv.gz`, defaulting to `jsonl.gz`; format selection does not
change the native full-download query or introduce paging.
