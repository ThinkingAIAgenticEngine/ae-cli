# analysis report-data run

Execute bounded inline data from one or more saved reports.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `run` command instead of `report-data export`.

Do not use this command for full, unknown-size, larger than 1000-row, or long-running report data; use `report-data export`.

This gateway report-data capability executes saved reports with model-specific overrides. It covers the 12 analysis report models from `ai_models.md` plus tag report data; tags are report-data only and are not ad-hoc `model_type` values.

Before adding any query-condition override, call `analysis report get` for every `report_id` and branch on `data.model_type`:

| Saved report model | Valid query-condition overrides |
|---|---|
| `sql` | Only `--sql-params`. SQL time conditions must be saved `definition.params` items of type `part_date` or time and overridden there. |
| Non-SQL analysis model | `--filters`, `--group-by`, `--start-time`, `--end-time`, `--time-granularity` |
| `tag` | No generic report-data override. Execute the saved tag definition or use `analysis history-tag-data run` for a tag-specific view. |

Command:

```bash
# Non-SQL analysis report
ae-cli analysis report-data run --project-id <project_id> --report-ids '[1001]' --filters '{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}' --start-time 2026-07-01 --end-time 2026-07-09 --limit 20

# SQL report, after analysis report get confirms definition.params contains platform
ae-cli analysis report-data run --project-id <project_id> --report-ids '[2001]' --sql-params '[{"name":"platform","value":"ios"}]' --limit 20
```

Input sends `project_id`, `report_ids`, optional `request_id`, `filters`, `group_by`, `sql_params`, `start_time`, `end_time`, `time_granularity`, `use_cache`, `limit`, and `timeout_seconds`. Control defaults: `--limit` default 100 / max 1000, `--timeout-seconds` default 120 / max 180. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

Override model:

- `filters`: AI-facing intent object `{relation:"and|or", items:[{field:{name,type?}, operator, values?}]}`. `field.type` supports `event_property`, `user_property`, `cluster`, and `tag`; omit it only when the field name is unambiguous. Use field names from `analysis report get` definition output or metadata commands. Do not pass raw QP fields such as `taFilters`, `junctionKind`, `columnName`, `tableType`, or `selectType`.
- `group-by`: AI-facing intent array `[{field:{name,type?}}]`. Use the same field model as report definitions. Do not pass raw `TaGroupByVo`. Time granularity is controlled by `--time-granularity`, not by `--group-by`.
- `sql-params`: SQL report dynamic parameter value overrides. First read `analysis report get`; saved SQL params are exposed as AI-facing `definition.params`. Every name must exist in every target SQL report because one batch shares the override. Send only override values for existing parameter names: `[{"name":"platform","value":"ios"}]`, `[{"name":"server_id","operator":"contains","value":"s1"}]`, `[{"name":"level","operator":"eq","values":["42"]}]`, `[{"name":"amount","operator":"between","values":["10","20"]}]`, `[{"name":"part_date","start_time":"2026-07-01 00:00:00","end_time":"2026-07-09 23:59:59"}]`, or `[{"name":"part_date","recent_day":"1-7"}]`. Time fields require a saved `part_date` or time parameter. Operators `eq`/`in`, `neq`/`not_in`, and `between` use `values`; comparison/like/contains operators use single `value`. Do not send definition fields.

A homogeneous SQL request that includes `filters`, `group_by`, `start_time`, `end_time`, or `time_granularity` fails with `INVALID_OVERRIDE_FOR_MODEL`. A homogeneous non-SQL request with `sql_params` also fails. Mixed-model batches are best-effort: data still returns and `meta.warnings[]` uses `OVERRIDE_IGNORED_FOR_MODEL`, `model_type`, `report_ids`, and `ignored_fields` to identify fields that did not apply. Do not discard these warnings.

For a newly created or updated dynamic SQL report, omit `--sql-params` to execute the saved default first. After that succeeds, then make one second call with `--sql-params` to change only the requested value. This separates a broken saved default from a broken override and avoids repeating the same query.

Output is the gateway envelope. `data` contains bounded inline report result items plus `query_context_id`, `drilldown_available`, and `result_cluster_available` when a context can be created.

An empty batch or report result with no rows is a successful query: it means the requested time range has no data. The command fails only when every returned report entry contains an explicit execution error. Mixed batches keep successful items and return `meta.partial`, counts, and per-report `meta.failures` for partial-result handling.

Use `query_context_id` with `analysis drilldown-users run` or `analysis query create-result-cluster`. Do not pass raw QP.
