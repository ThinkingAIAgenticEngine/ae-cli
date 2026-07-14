# analysis +query_adhoc (Ad Hoc Analysis Execution)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model analysis**

## Constraints

**⚠️ QUERY_EXISTING_FIRST:** Before using ad-hoc query, you MUST first check for existing reports with `+list_reports` and dashboards with `analysis dashboard list`. Only use `query_adhoc` if no matching asset is used. See [SKILL.md § D. QUERY_EXISTING_FIRST](../SKILL.md#d-query_existing_first).

**⚠️ QP_BUILDER_SUPPORTED_MODELS_ONLY:** QP builder supports all ten non-SQL ad-hoc model types: `event`, `retention`, `funnel`, `prop_analysis`, `attribution`, `distribution`, `heat_map`, `interval`, `path`, and `rank_list`.

For these ten model types, call the matching builder before `query_adhoc`. Do not handcraft QP from `get_analysis_query_schema`, examples, or prior knowledge.

Only `sql` has no builder. Use the schema/verified SQL-definition path for SQL.

For builder-supported models, schema/metadata tools are not builder pre-steps. After report/dashboard lookup misses, do not call `get_analysis_query_schema`, `list_events`, `list_properties`, `list_metrics`, `get_metric`, or `get_report_definition` before the builder. The builder resolves event/property/metric metadata internally.

**Hard stop rule:** If builder status is not `generated`, stop and ask the user to clarify or report the builder error. Do not call `query_adhoc`, `get_analysis_query_schema`, or manually assemble QP for any of the ten builder-supported models.

Builder mapping:
1. `event` -> `+build_event_analysis_qp`
2. `retention` -> `+build_retention_analysis_qp`
3. `funnel` -> `+build_funnel_analysis_qp`
4. `prop_analysis` -> `+build_prop_analysis_qp`
5. `attribution` -> `+build_attribution_analysis_qp`
6. `distribution` -> `+build_distribution_analysis_qp`
7. `heat_map` -> `+build_heat_map_analysis_qp`
8. `interval` -> `+build_interval_analysis_qp`
9. `path` -> `+build_path_analysis_qp`
10. `rank_list` -> `+build_rank_list_analysis_qp`

**Quick check workflow:**
1. `list_reports --query <keyword>` - search matching reports
2. `ae-cli analysis dashboard list --project-id <project_id> --query <keyword>` - search matching dashboards
3. If found → use `+query_report_data` or `analysis dashboard-report-data run/export`
4. If not found and model is non-SQL → read the matching builder reference, call the builder, then call `query_adhoc` with `model_type` + built `qp`; do not insert schema or metadata lookup before the builder
5. If not found and model is `sql` → use the schema/verified SQL-definition path, then call `query_adhoc`

## Use Cases
- Execute a QP produced by the required chain for the target model.
- Builder-supported models (all ten non-SQL models): execute the `qp` returned by builder tools.
- SQL: execute QP from the schema/verified SQL-definition path.
- Event analysis: metrics such as event trigger counts, user counts, sums, averages, and more.
- Retention analysis: metrics such as user churn and retention.
- Funnel analysis: metrics such as multi-step conversion.
- Distribution analysis: bucketed distribution analysis.
- Attribution analysis: multi-touch attribution analysis (first touch, last touch, linear attribution).
- Interval analysis: time interval analysis between events.
- Path analysis: user behavior path analysis.
- Property analysis: user property distribution analysis.
- Heat map: visual heat map analysis of user interactions.
- Rank list: ranking / leaderboard analysis.
- SQL: custom SQL analysis.
- Process:
  - Builder-supported models: builder -> `query_adhoc`
  - SQL: schema/verified definition -> `query_adhoc`

## Builder-Supported Model Chain
Use this chain for all ten non-SQL models.

1. Read the matching builder reference:
   - `event`: [`build_event_analysis_qp.md`](./build_event_analysis_qp.md)
   - `retention`: [`build_retention_analysis_qp.md`](./build_retention_analysis_qp.md)
   - `funnel`: [`build_funnel_analysis_qp.md`](./build_funnel_analysis_qp.md)
   - `prop_analysis`: [`build_prop_analysis_qp.md`](./build_prop_analysis_qp.md)
   - `attribution`: [`build_attribution_analysis_qp.md`](./build_attribution_analysis_qp.md)
   - `distribution`: [`build_distribution_analysis_qp.md`](./build_distribution_analysis_qp.md)
   - `heat_map`: [`build_heat_map_analysis_qp.md`](./build_heat_map_analysis_qp.md)
   - `interval`: [`build_interval_analysis_qp.md`](./build_interval_analysis_qp.md)
   - `path`: [`build_path_analysis_qp.md`](./build_path_analysis_qp.md)
   - `rank_list`: [`build_rank_list_analysis_qp.md`](./build_rank_list_analysis_qp.md)
2. Compose the builder JSON using the documented DTO keys. Nested JSON keys are camelCase, not snake_case.
3. Run the builder with all required flags. `--dry-run` is allowed only with complete required builder inputs, not by itself.
4. If builder returns `status=generated`, copy `data.qp` from the builder response and pass it as `--qp`.
5. If the builder returns `need_clarification`, `invalid_argument`, `unsupported_feature`, or `validation_error`, stop and ask for clarification. Do not use the manual path as a fallback.

## Legacy Query Chain
Use this chain only for `sql`.

1. Read this reference and the required schema/metadata references.
2. Call `+get_analysis_query_schema` for the target model when the QP shape is not already verified.
3. Discover real events/properties/metrics with analysis metadata commands as needed.
4. Construct QP according to the documented schema and verified metadata.
5. Call `+query_adhoc`.

Timezone rule:
- Builder commands do not accept `zone_offset`.
- Apply timezone only on this execution command, for example `--zone_offset -11`.

## Command Syntax
```bash
ae-cli analysis +query_adhoc --project_id <project_id> --model_type <model_type> --qp '<qp_json_from_builder_or_legacy_chain>'
ae-cli analysis +query_adhoc --project_id <project_id> --model_type <model_type> --qp '<qp_json_from_builder_or_legacy_chain>' --fields '["date","event"]' --limit 10 --offset 0 --zone_offset 8 --request_id mcp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --use_cache true --is_sort_by_columns true --resolve_recent_day true --timeout_minutes 8
ae-cli analysis +query_adhoc --project_id <project_id> --model_type <model_type> --qp '<qp_json_from_builder_or_legacy_chain>' --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID used to identify the analysis project |
| `--model_type` | Yes | Model type. Supported values: event, retention, funnel, distribution, attribution, heat_map, interval, path, rank_list, prop_analysis, sql. |
| `--qp` | Yes | Query parameter JSON. For every non-SQL model, pass QP returned by the matching builder tool. For SQL, use the schema/verified-definition path. |
| `--request_id` | Yes | Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. `requestId` is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`. The response `metadata.requestId` echoes the supplied requestId and can also be passed to `cancel_query(requestId)` when the query is no longer needed. |
| `--use_cache` | No | Whether to use result cache. Default: true |
| `--zone_offset` | No | Time zone offset in hours. For example, UTC+8 is 8 and UTC-5 is -5 |
| `--is_sort_by_columns` | No | Whether to sort query results by columns. Default: false |
| `--resolve_recent_day` | No | Whether to resolve relative time expressions such as "last 7 days". If omitted, service auto-resolves when `qp.eventView.recentDay` exists and `startTime`/`endTime` is incomplete; otherwise defaults to false. |
| `--fields` | No | Optional fields to return. Must match column names in result. Invalid fields cause INVALID_FIELDS error. |
| `--limit` | No | Optional limit. Default: 1000, maximum: 10000. |
| `--offset` | No | Optional offset. Default: 0. |
| `--timeout_minutes` | No | Query timeout in minutes. If the query exceeds this time, it will be cancelled automatically. |

## Decision Rules
- On the first run, include all required parameters (`--project_id`,`--model_type`,`--qp`,`--request_id`). Generate `--request_id` before starting the query so cancellation can use the same value if the caller stops waiting.
- Do not call this command with placeholder QP such as `{}`. For non-SQL models, wait for builder `status=generated`; for SQL, build QP from a verified schema/definition first.
- For builder-supported models, do not run metadata/schema lookup to "help" the builder. The builder is the metadata resolver.
- For pagination, use `--limit` and `--offset` together. Default limit is 1000, maximum 100000.
- For `model_type=sql`, use exactly one row limit: either put `LIMIT` in the SQL, or use `--limit`. If both are present they must be equal — `query_adhoc` rejects mismatched values to avoid silently sampled or duplicated results. When the SQL already has a trailing `LIMIT`, you may omit `--limit` and the SQL governs.
- Use `--fields` to select specific columns for lighter response payloads.
- Non-SQL models must not manually craft QP with schema-first flow; call the matching builder and use its returned `qp`.
- For SQL, `qp` must satisfy both schema structure and project metadata constraints.
- Wrap JSON parameters in single quotes (for example `--qp '<real_qp_json>'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- If the user supplied a timezone such as UTC-11, pass `--zone_offset -11` here, not to the builder.

## Next Steps on Failure
- If required parameters are missing, resolve `project_id`, `model_type`, and a real `qp` first. Do not run placeholder calls except explicit `--dry-run` validation.
- If a builder returns non-`generated` status, stop and ask the user to clarify before calling `query_adhoc`.
- If `Invalid JSON` appears on legacy manual QP paths, first check schema required fields, then verify whether event/property names come from metadata query results for the same `project_id`.
- If the query returns `fetch failed`, hits an HTTP timeout, or the caller stops waiting after you preset `--request_id`, immediately call `+cancel_query --request_id <same value> --yes`; the backend query may still be running.
- If the query times out inside the service and returns `QUERY_TIMEOUT`, use the returned `metadata.requestId` for cancellation if further cleanup is needed, then narrow the time range / grouping dimensions and split subqueries to locate the issue.

## Recommended chaining
- +build_event_analysis_qp -> +query_adhoc
- +build_retention_analysis_qp -> +query_adhoc
- +build_funnel_analysis_qp -> +query_adhoc
- +build_prop_analysis_qp -> +query_adhoc
- +build_attribution_analysis_qp / +build_distribution_analysis_qp / +build_heat_map_analysis_qp / +build_interval_analysis_qp / +build_path_analysis_qp / +build_rank_list_analysis_qp -> +query_adhoc
- +get_analysis_query_schema -> +query_adhoc (SQL only)
- +list_events -> +list_properties -> +query_adhoc -> +drilldown_users -> +drilldown_user_events
