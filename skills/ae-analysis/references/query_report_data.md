# analysis +query_report_data (query data by report)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Report Management**

## Use Cases
- Prerequisite helper: first call `+get_filter_schema` to get the structure, then call this tool.
- Prerequisite helper: first call `+get_groupby_schema` to get the structure, then call this tool.
- When building `filters` / `group_by`, you must supplement the project's real event/property metadata.
- Query analysis data for one or more reports. Returns chart values, trend results, and similar data, but not report definitions. Supports extra filters, group-by settings, and time range overrides.
- Query analysis data for one or more reports.

## Mandatory Prerequisites (MUST)
- Before building `--filters` / `--group_by`, you must first read and follow the following reference docs:
  - [`./get_filter_schema.md`](./get_filter_schema.md)
  - [`./get_groupby_schema.md`](./get_groupby_schema.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not generate final `filters` / `group_by` until the above docs have been read and the prerequisite commands have been called.

## Prerequisite Call Chain (required for building filters/group_by)
1. Read `get_filter_schema.md`, then call `ae-cli analysis +get_filter_schema` to get the filter structure.
2. Read `get_groupby_schema.md`, then call `ae-cli analysis +get_groupby_schema` to get the grouping structure.
3. Read `list_events.md`, then call `ae-cli analysis_meta +list_events --project_id <project_id>`.
4. Read `list_properties.md`, then call `ae-cli analysis_meta +list_properties --project_id <project_id>`.
5. Build `filters` / `group_by` based on the schema and metadata, then call `+query_report_data`.

## Commands
```bash
ae-cli analysis +query_report_data --project_id <project_id> --report_ids '[1001]'
ae-cli analysis +query_report_data --project_id <project_id> --report_ids '[1001]' --filters '{}' --group_by '[]' --request_id mcp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa --use_cache true --start_date 2026-04-08 --end_date 2026-04-08 --time_granularity day --timeout_minutes 8
# SQL-model report: override its dynamic parameters (${Selector}/${Time}/${Text}) by paramName
ae-cli analysis +query_report_data --project_id <project_id> --report_ids '[1001]' --sql_params '[{"paramName":"selector1","paramExpress":"<selectorName>"},{"paramName":"time2","startTime":"2026-01-01 00:00:00","endTime":"2026-06-30 23:59:59"}]'
ae-cli analysis +query_report_data --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--report_ids` | Yes | List of report IDs |
| `--filters` | No | Optional filter JSON. If provided, MUST follow `+get_filter_schema`, and referenced fields must come from `analysis_meta +list_properties` in the same `project_id`. |
| `--group_by` | No | Optional group-by JSON array. If provided, MUST follow `+get_groupby_schema`, and referenced fields must come from `analysis_meta +list_properties` in the same `project_id`. |
| `--request_id` | Yes | Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. `requestId` is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`. The response `metadata.requestId` echoes the supplied requestId and can also be passed to `cancel_query(requestId)` when the query is no longer needed. |
| `--use_cache` | No | Whether to use cache. Default: true |
| `--start_date` | No | Optional start date in yyyy-MM-dd format |
| `--end_date` | No | Optional end date in yyyy-MM-dd format |
| `--time_granularity` | No | Optional time granularity used to override the report default. Supported values: minute, minute5, minute10, hour, day, week, month, quarter, year, total. |
| `--timeout_minutes` | No | Query timeout in minutes. If the query exceeds this time, it will be cancelled automatically. 30 minutes if omitted. |
| `--sql_params` | No | Optional override for a SQL-model report's dynamic parameters (the `${...}` placeholders embedded in the report SQL). JSON array of params matched by `paramName`. Only listed params are overridden; omitted params keep the report's saved defaults. Ignored for non-SQL reports. Different from `--filters`: see the SQL report dynamic parameters section below. |

## SQL report dynamic parameters (`--sql_params`)
- Applies ONLY to SQL-model reports (`reportModel: sql` in `+get_report_definition`). Such reports may embed `${...}` placeholders of 6 paramTypes — `Variable`, `PartDate`, `Time`, `Number`, `Text`, `Selector` — whose default values are saved in the report's `eventView.sqlViewParams`.
- `--sql_params` overrides those values by `paramName`; the backend merges them into the report's `sqlViewParams` before running the SQL. Omitting `--sql_params` keeps the report defaults (backward compatible).
- `--sql_params` is NOT the same as `--filters`: `--filters` adds a post-query WHERE filter on the SQL result columns (using real field names), while `--sql_params` changes the report's own dynamic parameters before the SQL runs. To adjust a report's selectors/time parameters, use `--sql_params`, not `--filters`.
- Workflow: `+get_report_definition` -> read `events.sqlVoParams` (each param's `paramName`, `paramType`, and for Selector the allowed `selectorItems` names) -> build the override array -> `+query_report_data --sql_params '[...]'`.
- Override shape by `paramType` (read each param's current `quota`/`paramExpress`/`startTime`/`endTime` and the VO's `variableType`/`selectorItems` from `+get_report_definition`):
  - `Selector` — `{"paramName":"selector1","paramExpress":"<selectorName>"}`; `<selectorName>` must be one of the VO's `selectorItems`. No `quota`.
  - `Variable` — no `quota`; override `paramExpress` only. Quoting depends on the VO's `variableType`: a custom (`Normal`) variable is substituted verbatim, so include the quotes exactly as shown in the definition (e.g. `"paramExpress":"'2025-12-31'"`); a `TimeSelect` variable takes a bare value (the backend quotes it). `variableType` itself is a report-design property in `events.sqlVoParams` and is NOT changed by `--sql_params` (only the value is); the resulting SQL is the same regardless of `variableType` as long as the value is supplied with the right quoting.
  - `Text` — `quota` (operator) + `paramExpress`; supports all 12 operators in the table below. Setting only `paramExpress` while leaving the no-value default `quota` (e.g. `C04`) does NOT filter.
  - `Number` — `quota` (operator) + `paramExpress`; 9 numeric operators: `C00` IN / `C01` NOT IN / `C06` BETWEEN (array); `C02` < / `C03` > / `C020` <= / `C030` >= (single, numeric string); `C04` IS NOT NULL / `C05` IS NULL (no value). No LIKE/CONTAIN for numbers. E.g. `{"paramName":"num1","quota":"C06","paramExpress":["10","20"]}`.
  - `Time` — `quota` (operator) + time fields (NOT recentDay): `C020` <= (uses `endTime`) / `C030` >= (uses `startTime`) / `C06` BETWEEN by datetime (`startTime`+`endTime`) / `C060` BETWEEN by date (`startTime`+`endTime`) / `C04` IS NOT NULL / `C05` IS NULL (no value). To only change the range keep the report's range `quota` and set `startTime`+`endTime`; to change the operator also set `quota`.
  - `PartDate` — a date range; set `startTime`+`endTime`: `{"paramName":"date1","startTime":"yyyy-MM-dd HH:mm:ss","endTime":"yyyy-MM-dd HH:mm:ss"}`.

  `quota` operators (Text = all; Number = the non-LIKE subset; Time = comparison/range/null subset using time fields):

  | quota | operator | value |
  |---|---|---|
  | `C00` | IN | array `paramExpress` |
  | `C01` | NOT IN | array `paramExpress` |
  | `C06` | BETWEEN / 区间 | array `[min,max]` (Time: `startTime`+`endTime`) |
  | `C060` | BETWEEN by date / 日期区间 (Time only) | `startTime`+`endTime` |
  | `C02` / `C03` | `<` / `>` | single `paramExpress` |
  | `C020` / `C030` | `<=` / `>=` | single `paramExpress` (Time: `endTime` / `startTime`) |
  | `C30` / `C31` | LIKE / NOT LIKE (Text only) | single `paramExpress` |
  | `C300` | CONTAIN (`LIKE '%v%'`, Text only) | single `paramExpress` |
  | `C04` / `C05` | IS NOT NULL / IS NULL | no value (`C04` empty default = no filter) |

- An unknown `paramName` (not present in the report) or malformed JSON returns an error.

## Decision Rules
- `filters` / `group_by` cannot be written by hand based on experience alone: they must satisfy both the schema structure and the project's real metadata.
- `list_events` / `list_properties` must be learned from the corresponding reference docs before calling them.
- For the first run, include all required parameters (`--project_id`, `--report_ids`, `--request_id`) and add optional parameters after confirming the chain works.
- Generate and pass `--request_id` before starting any cancelable query; it is required. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running; call `+cancel_query --request_id <same value>` with the preset ID. The value must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Omitted or blank IDs return `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`.
- Wrap JSON parameters in single quotes (for example `--report_ids '{}'`, `--filters '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, validate with a short range first and then expand gradually.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--report_ids`, `--request_id`).
- If `Invalid JSON` appears, first check the required schema fields, then verify that the event name/property name comes from metadata queried in the same `project_id`.
- If the query times out or the result is abnormal, first reduce the time range/grouping dimensions, then split the query to locate the issue.

## Recommended Chaining
- +get_filter_schema -> +get_groupby_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +query_report_data
- (SQL-model report, override dynamic params) +get_report_definition -> +query_report_data --sql_params '[...]'
- +list_reports -> +get_report_definition -> +query_report_data
