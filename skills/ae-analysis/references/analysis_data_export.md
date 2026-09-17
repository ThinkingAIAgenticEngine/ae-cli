# Analysis data exports

Read this after selecting an analysis data export. For a bounded query and local result reading, use [analysis_data_retrieval.md](analysis_data_retrieval.md).

Use the matching `export --output <file>` command for full, unknown-size, over-limit, long-running or timed-out query results.

Export commands are asynchronous artifact jobs and do not accept
`--preview-rows`. Native full-download paths retain their existing model/SQL total row
ceilings.

`--artifact-format` selects the logical row format, not compression. Read the returned `format`, `compression`, `file_name`, `content_type`, and `content_encoding`; analysis query exports are currently gzip-compressed even when the logical format is `jsonl` or `csv`.

Default and maximum runtime is 21600 seconds (6 hours). Omit `--timeout-seconds` to use that default, or pass a smaller value when the caller explicitly wants an earlier deadline.

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
