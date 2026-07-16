# analysis data retrieval routing

This is the single routing policy for analysis data retrieval commands. It is scoped to `ae-cli analysis` data queries only; do not generalize it to other `te-cli` business modules.

## Scope

This policy applies to:

- `analysis adhoc run` / `analysis adhoc export`
- `analysis report-data run` / `analysis report-data export`
- `analysis dashboard-report-data run` / `analysis dashboard-report-data export`
- `analysis bi-panel-page-data run` / `analysis bi-panel-page-data export`
- `analysis event-detail run` / `analysis event-detail export`
- `analysis entity-detail run` / `analysis entity-detail export`
- `analysis drilldown-users run` / `analysis drilldown-users export`
- `analysis drilldown-user-events run` / `analysis drilldown-user-events export`
- `analysis user-cluster-member list` / `analysis user-cluster-member export`
- `analysis user-tag-member list` / `analysis user-tag-member export`
- `analysis history-tag-data run` / `analysis history-tag-data export`
- `analysis history-tag-data-drilldown run` / `analysis history-tag-data-drilldown export`

This policy does not apply to:

- `analysis user-cluster list/get`, `analysis user-tag list/get`, create/update/refresh/delete, ID-file operations, and history-tag management commands.
- `analysis_meta`, metadata, DataOps, Community, Engage, or other business modules.
- Report/dashboard/BI asset list commands, catalog exports, definition import/export, or management commands.

## Decision rule

Use `run` only when all conditions are true:

- The user needs an inline preview or immediate JSON result.
- The expected result fits in `<=1000` rows.
- The query is expected to finish within the sync timeout window, normally `<=180` seconds.

`run` defaults to `--limit 100`. If the user needs 101 to 1000 rows inline, pass an explicit `--limit <n>` where `n <= 1000`.

The dashboard report-data sync timeout defaults to 180 seconds because one call may execute multiple reports. Other sync analysis data retrieval commands default to 120 seconds. The maximum remains 180 seconds, and an explicitly supplied lower timeout always wins.

Detail `run` commands (`event-detail run` and `entity-detail run`) return only the first bounded preview rows. They do not support `--offset` or stable pagination. If the response has `truncated=true`, switch to the matching `export` command instead of trying to fetch later pages. For detail run, `truncated=true` can mean the preview hit its row cap even when the backend total is not an exact full count.

User member, history-tag drilldown, and result drilldown `list/run` commands are bounded previews. They do not expose pagination. Use the matching `export` command for full or unknown-size data; Common advances backend batches internally and writes one artifact.

Use `export` when any condition is true:

- The user asks for full data, all rows, a downloadable file, or an export.
- The result size is unknown or expected to exceed 1000 rows.
- The query may be long-running or may exceed the sync timeout window.
- The result should be durable and processed from a file instead of printed inline.

Export commands are asynchronous artifact jobs. They do not use the inline `--limit` policy. After submitting an export, use:

`--artifact-format` selects the logical row format, not compression. Read the returned `format`, `compression`, `file_name`, `content_type`, and `content_encoding`; analysis query exports are currently gzip-compressed even when the logical format is `jsonl` or `csv`.

Default and maximum runtime is 21600 seconds (6 hours). Omit `--timeout-seconds` to use that default, or pass a smaller value when the caller explicitly wants an earlier deadline.

```bash
ae-cli analysis run inspect --run-id <run_id>
ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>
```

Download only after `analysis run inspect` reports `status=SUCCEEDED` and `artifact_status=COMPLETED`. If download returns `ARTIFACT_NOT_READY`, inspect again later; do not keep retrying download while the run is still `RUNNING`.

Cancel an async run/export with:

```bash
ae-cli analysis query cancel --run-id <run_id>
```

If `analysis run inspect` or `analysis artifact download` returns HTTP 404 for a valid `run_id` / `artifact_id` from the same export response, treat it as a backend route/capability deployment issue. Do not keep polling or invent download URLs.

If the current host returns `CAPABILITY_NOT_FOUND` for a documented command, treat it as host/backend capability unavailability. Do not retry with different JSON shapes or flags; choose another supported path only when it satisfies the user's request, otherwise report the backend gap.

Detail, drilldown, user-member, and history-tag exports read backend batches until completion. Backend paging is an implementation detail and must not appear as `offset`, `page_num`, or `page_size` in the caller contract. Do not collect full data by repeated `list/run` calls.

## Follow-up context

Analysis data `run` responses, export submit responses, and JSONL export artifact metadata may include `query_context_id` and `sources` when Redis context creation succeeds. Follow-up commands are allowed only when `drilldown_available=true` and the selected source includes `target_contract`; otherwise read `drilldown_unavailable_reason` and do not infer source IDs, dates, groups, or model fields from display text.

For date-based drilldown, copy the stable machine field `drilldown_date`, never parse `display_date`. The machine format follows the query particle: day/week `yyyy-MM-dd`, month/quarter `yyyy-MM`, year `yyyy`, hour/minute `yyyy-MM-dd HH:mm`, and millisecond `yyyy-MM-dd HH:mm:ss.SSS`.

When present, compare `effective_time_range` with `data_time_range`. `effective_time_range` is the resolved query scope, while `data_time_range` is the observed returned-row range. `clipping_reasons=[]` means the gateway applied no silent range cap; a narrower `data_time_range` then reflects available/returned data rather than a gateway range clamp.

Use that `query_context_id` for:

- `analysis drilldown-users run` or `analysis drilldown-users export`
- `analysis query create-result-cluster`

Do not reconstruct or pass raw QP for follow-up drilldown or result-cluster creation.

CSV artifacts intentionally contain only CSV data; obtain `query_context_id` and `sources` from the export submit response instead of looking for a metadata line in CSV.

If the response does not include `query_context_id` and does not explicitly expose `drilldown_available=true`, stop before drilldown/result-cluster commands. Report that this result cannot be followed up with context-based drilldown in the current response.

For sync `run`, ae-cli may add `_cli_inline_limit` and `_cli_truncation` metadata when it has to truncate returned `rows` arrays locally to enforce the requested inline limit. Use `export` for full data.

## BI page data note

For `analysis bi-panel-page-data`, `--row-limit`, `--row-offset`, `--block-limit`, and `--block-offset` are BI page/chart/summary window controls. They are not the generic sync-vs-async routing policy and do not change the rule above: use `run` for bounded inline results, and `export` for full, unknown-size, larger than 1000-row, or long-running data retrieval.

BI page `charts` results may return `query_context_id` for SQL chart-source traceability. Treat it as drilldown-capable only when `drilldown_available=true`; BI SQL chart contexts normally return `drilldown_available=false` and `result_cluster_available=false`.
