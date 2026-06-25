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
ae-cli analysis +query_report_data --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--report_ids` | Yes | List of report IDs |
| `--filters` | No | Optional filter JSON. If provided, MUST follow `+get_filter_schema`, and referenced fields must come from `analysis_meta +list_properties` in the same `project_id`. |
| `--group_by` | No | Optional group-by JSON array. If provided, MUST follow `+get_groupby_schema`, and referenced fields must come from `analysis_meta +list_properties` in the same `project_id`. |
| `--request_id` | No | Optional unique request ID used for tracking and cancellation. If provided, it must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. For long-running or cancelable queries, provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. The auto-generated requestId is not available when the HTTP request fails before a response, so preset `requestId` is required for proactive cleanup. Generated automatically if omitted. The response `metadata.requestId` can also be passed to `cancel_query` when the query is no longer needed. |
| `--use_cache` | No | Whether to use cache. Default: true |
| `--start_date` | No | Optional start date in yyyy-MM-dd format |
| `--end_date` | No | Optional end date in yyyy-MM-dd format |
| `--time_granularity` | No | Optional time granularity used to override the report default. Supported values: minute, minute5, minute10, hour, day, week, month, quarter, year, total. |
| `--timeout_minutes` | No | Query timeout in minutes. If the query exceeds this time, it will be cancelled automatically. 30 minutes if omitted. |

## Decision Rules
- `filters` / `group_by` cannot be written by hand based on experience alone: they must satisfy both the schema structure and the project's real metadata.
- `list_events` / `list_properties` must be learned from the corresponding reference docs before calling them.
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--report_ids`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--report_ids '{}'`, `--filters '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, validate with a short range first and then expand gradually.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--report_ids`).
- If `Invalid JSON` appears, first check the required schema fields, then verify that the event name/property name comes from metadata queried in the same `project_id`.
- If the query times out or the result is abnormal, first reduce the time range/grouping dimensions, then split the query to locate the issue.

## Recommended Chaining
- +get_filter_schema -> +get_groupby_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +query_report_data
- +list_reports -> +get_report_definition -> +query_report_data
