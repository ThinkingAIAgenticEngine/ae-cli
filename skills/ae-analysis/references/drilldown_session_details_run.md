# analysis drilldown-session-details run

Preview the individual sessions or steps behind one selected session-analysis cell.

Read [`analysis_drilldown_contract.md`](analysis_drilldown_contract.md) first. Call this only for a `session` model result whose selected column is a session-count or step-count population and whose returned action advertises `drilldown_session_details`. Session-user and step-user columns are entity populations: use `analysis drilldown-entities run|export` for those. Duration, dwell, depth, rate, and per-user ratio columns are descriptive statistics and are not selectable populations at all.

## Command

```bash
ae-cli analysis drilldown-session-details run \
  --project-id <project_id> \
  --query-context-id <sync_preview_query_context_id> \
  [--source '{"report_id":1001}'] \
  --coordinate '{"date":"2026-08-30","group_values":["add_to_cart"]}' \
  [--use-cache true] \
  [--preview-rows 100] \
  [--timeout-seconds 120]
```

## Input

- `--project-id`: the project used by the synchronous preview. Common rejects a project ID that does not match the project stored by `query_context_id`.
- `--query-context-id`: `ctx_<32 lowercase hex>` returned by a synchronous `analysis adhoc run`, `report-data run`, or `dashboard-report-data run` of a `session` model. Exports never create one.
- `--source`: the source selector returned in the compact `sources[]` summary when the preview owns more than one report or chart. Pass exactly one returned field, `report_id` or `chart_id`.
- `--coordinate`: one cell coordinate built only from the `row_options`, `column_options`, and `metric_options` fragments returned by `analysis query-context get`. For session analysis it carries `group_values` plus a machine `date`; a total-granularity result has no `date`. Never send `row_index`, `column_index`, `values`, `label`, `target_id`, a display-formatted date, raw QP, or a coordinate read from an export file.
- `--preview-rows`: default 100, maximum 1000. 1000 is also the backend session-detail ceiling.
- `--timeout-seconds`: default 120, maximum 180.

Do not use this command for a non-`session` model, for a coordinate assembled by hand, or as a substitute for `analysis adhoc run` when the caller actually wants aggregated session metrics.

## Output and next intent

The response contains `items`, `returned_rows`, `has_more`, `request_id`, `query_context_id`, `event_name_desc_meta`, and `result_generate_time`.

- `view_mode=session` items are one row per session: `virtual_session_id`, `#user_id`, `session_seq`, `date_group`, `start_time`, `end_time`, `session_duration`, `session_depth`, `start_event`, and `end_event`.
- `view_mode=step` items keep the leading session identity columns and replace the session-end columns with `event`, `step_index`, `dwell_seconds`, and `is_last`.
- Every time value in the rows, including `date_group`, `start_time`, `end_time`, and datetime session properties, is already a wall-clock string in the analysis time zone, formatted `yyyy-MM-dd HH:mm:ss.SSS`. Show it as is; do not shift it by the project time-zone setting or treat it as UTC.
- `session_seq` is the session's order within its own user, not a global row number. `#user_id` is an internal association key; show account ID or visitor ID to customers and keep `#user_id` for machine linkage.
- There is no `total`. The detail query does not count the full population, so never report `returned_rows` as the session total; read the session count from the originating analysis cell instead.
- There is no export variant and no paging. When `has_more=true`, the remaining rows are not retrievable through this command; narrow the analysis itself (tighter time range, added `session_filter`, or finer groups) and re-run the preview.
- This command creates no new drilldown context. `analysis drilldown-user-events run|export` continues only from a user-subject `analysis drilldown-entities run`, never from a session row.
