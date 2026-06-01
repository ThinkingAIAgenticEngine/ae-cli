# analysis +query_adhoc (Ad Hoc Analysis Execution)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model analysis**

## Constraints

**⚠️ QUERY_EXISTING_FIRST:** Before using ad-hoc query, you MUST first check for existing reports/dashboards with `list_reports` and `list_dashboards`. Only use `query_adhoc` if no matching reports found. See [SKILL.md § D. QUERY_EXISTING_FIRST](../SKILL.md#d-query_existing_first).

**⚠️ QP_BUILDER_SUPPORTED_MODELS_ONLY:** QP builder supports exactly four ad-hoc model types: `event`, `retention`, `funnel`, and `prop_analysis`.

For these four model types, call the matching builder before `query_adhoc`. Do not handcraft QP from `get_analysis_query_schema`, examples, or prior knowledge.

For all other model types (`distribution`, `attribution`, `heat_map`, `interval`, `path`, `rank_list`, `sql`), QP builder is not supported. Use the legacy schema/metadata path and construct QP manually according to the model schema.

For builder-supported models, schema/metadata tools are not builder pre-steps. After report/dashboard lookup misses, do not call `get_analysis_query_schema`, `list_events`, `list_properties`, `list_metrics`, `get_metric`, or `get_report_definition` before the builder. The builder resolves event/property/metric metadata internally.

**Hard stop rule:** If builder status is not `generated`, stop and ask the user to clarify or report the builder error. Do not call `query_adhoc`, `get_analysis_query_schema`, or manually assemble QP for `event`, `retention`, `funnel`, or `prop_analysis`.

Builder mapping:
1. `event` -> `+build_event_analysis_qp`
2. `retention` -> `+build_retention_analysis_qp`
3. `funnel` -> `+build_funnel_analysis_qp`
4. `prop_analysis` -> `+build_prop_analysis_qp`

**Quick check workflow:**
1. `list_reports --query <keyword>` - search matching reports
2. `list_dashboards --query <keyword>` - search matching dashboards
3. If found → use `query_report_data` or `query_dashboard_report_data`
4. If not found and model is builder-supported (`event`/`retention`/`funnel`/`prop_analysis`) → read matching builder reference, call matching builder, then call `query_adhoc` with `model_type` + built `qp`; do not insert schema or metadata lookup before the builder
5. If not found and model is not builder-supported (`distribution`/`attribution`/`heat_map`/`interval`/`path`/`rank_list`/`sql`) → use the legacy schema/metadata path, then call `query_adhoc`

## Use Cases
- Execute a QP produced by the required chain for the target model.
- Builder-supported models (`event`, `retention`, `funnel`, `prop_analysis`): execute the `qp` returned by builder tools.
- Non-builder models (`distribution`, `attribution`, `heat_map`, `interval`, `path`, `rank_list`, `sql`): execute handcrafted QP from the legacy schema/metadata path when needed.
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
  - Non-builder models: metadata/schema lookup -> handcraft `qp` -> `query_adhoc`

## Builder-Supported Model Chain
Use this chain only for `event`, `retention`, `funnel`, and `prop_analysis`.

1. Read the matching builder reference:
   - `event`: [`build_event_analysis_qp.md`](./build_event_analysis_qp.md)
   - `retention`: [`build_retention_analysis_qp.md`](./build_retention_analysis_qp.md)
   - `funnel`: [`build_funnel_analysis_qp.md`](./build_funnel_analysis_qp.md)
   - `prop_analysis`: [`build_prop_analysis_qp.md`](./build_prop_analysis_qp.md)
2. Compose the builder JSON using the documented DTO keys. Nested JSON keys are camelCase, not snake_case.
3. Run the builder with all required flags. `--dry-run` is allowed only with complete required builder inputs, not by itself.
4. If builder returns `status=generated`, copy `data.qp` from the builder response and pass it as `--qp`.
5. If the builder returns `need_clarification`, `invalid_argument`, `unsupported_feature`, or `validation_error`, stop and ask for clarification. Do not use the legacy/manual path as a fallback for these four models.

## Legacy Query Chain
Use this chain only for `distribution`, `attribution`, `heat_map`, `interval`, `path`, `rank_list`, and `sql`.

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
ae-cli analysis +query_adhoc --project_id <project_id> --model_type <model_type> --qp '<qp_json_from_builder_or_legacy_chain>' --fields '["date","event"]' --limit 10 --offset 0 --zone_offset 8 --request_id demo --use_cache true --is_sort_by_columns true --resolve_recent_day true --timeout_minutes 8
ae-cli analysis +query_adhoc --project_id <project_id> --model_type <model_type> --qp '<qp_json_from_builder_or_legacy_chain>' --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID used to identify the analysis project |
| `--model_type` | Yes | Model type. Supported values: event, retention, funnel, distribution, attribution, heat_map, interval, path, rank_list, prop_analysis, sql. |
| `--qp` | Yes | Query parameter JSON. For `event`/`retention`/`funnel`/`prop_analysis`, pass QP returned by the matching builder tool. For non-builder models, construct QP through the legacy schema/metadata path. |
| `--request_id` | No | Optional unique request ID used for tracking and deduplication. Generated automatically if omitted. |
| `--use_cache` | No | Whether to use result cache. Default: true |
| `--zone_offset` | No | Time zone offset in hours. For example, UTC+8 is 8 and UTC-5 is -5 |
| `--is_sort_by_columns` | No | Whether to sort query results by columns. Default: false |
| `--resolve_recent_day` | No | Whether to resolve relative time expressions such as "last 7 days". If omitted, service auto-resolves when `qp.eventView.recentDay` exists and `startTime`/`endTime` is incomplete; otherwise defaults to false. |
| `--fields` | No | Optional fields to return. Must match column names in result. Invalid fields cause INVALID_FIELDS error. |
| `--limit` | No | Optional limit. Default: 20, maximum: 50. |
| `--offset` | No | Optional offset. Default: 0. |
| `--timeout_minutes` | No | Query timeout in minutes. If the query exceeds this time, it will be cancelled automatically. |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`,`--model_type`,`--qp`), and add optional parameters after confirming the path works.
- Do not call this command with placeholder QP such as `{}`. For builder-supported models, wait for builder `status=generated`; for non-builder models, build QP from verified schema/metadata first.
- For builder-supported models, do not run metadata/schema lookup to "help" the builder. The builder is the metadata resolver.
- For pagination, use `--limit` and `--offset` together. Default limit is 20.
- Use `--fields` to select specific columns for lighter response payloads.
- `event`, `retention`, `funnel`, and `prop_analysis` must not manually craft QP with schema-first flow; call the builder and use the returned `qp`.
- For non-builder models, `qp` must satisfy both schema structure and project metadata constraints.
- Wrap JSON parameters in single quotes (for example `--qp '<real_qp_json>'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- If the user supplied a timezone such as UTC-11, pass `--zone_offset -11` here, not to the builder.

## Next Steps on Failure
- If required parameters are missing, resolve `project_id`, `model_type`, and a real `qp` first. Do not run placeholder calls except explicit `--dry-run` validation.
- If a builder returns non-`generated` status for `event`, `retention`, `funnel`, or `prop_analysis`, stop and ask user to clarify before calling `query_adhoc`.
- If `Invalid JSON` appears on legacy manual QP paths, first check schema required fields, then verify whether event/property names come from metadata query results for the same `project_id`.
- If the query times out or results are abnormal, first narrow the time range / grouping dimensions, then split the subqueries to locate the issue.

## Recommended chaining
- +build_event_analysis_qp -> +query_adhoc
- +build_retention_analysis_qp -> +query_adhoc
- +build_funnel_analysis_qp -> +query_adhoc
- +build_prop_analysis_qp -> +query_adhoc
- +get_analysis_query_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +query_adhoc (non-builder models only)
- +list_events -> +list_properties -> +query_adhoc -> +drilldown_users -> +drilldown_user_events
