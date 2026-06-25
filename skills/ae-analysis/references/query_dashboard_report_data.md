# analysis +query_dashboard_report_data (Batch Query Dashboard Report Data)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Dashboard management**

## Use Cases
- Precondition helper: call `+get_filter_schema` to get the structure before using this tool.
- When constructing `filters`, you must supplement it with real event/property metadata from the project.
- Query analysis data for one or more reports in a dashboard. Returns actual analysis results without the dashboard definition. Supports additional filters and time range overrides.
- Query analysis data for one or more reports in a dashboard.

## Mandatory prerequisites (MUST)
- Before constructing `--filters`, you must first read and follow these reference documents:
  - [`./get_filter_schema.md`](./get_filter_schema.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not generate the final `filters` until the documentation review and prerequisite command calls are complete.

## Prerequisite call chain (required for constructing filters)
1. Read `get_filter_schema.md`, then call `ae-cli analysis +get_filter_schema` to get the filter structure.
2. Read `list_events.md`, then call `ae-cli analysis_meta +list_events --project_id <project_id>`.
3. Read `list_properties.md`, then call `ae-cli analysis_meta +list_properties --project_id <project_id>`.
4. Build `filters` from the schema + metadata, then call `+query_dashboard_report_data`.

## Command
```bash
ae-cli analysis +query_dashboard_report_data --project_id <project_id> --dashboard_id 1
ae-cli analysis +query_dashboard_report_data --project_id <project_id> --dashboard_id 1 --filters '{}' --start_date 2026-04-08 --end_date 2026-04-08 --time_granularity day --use_cache true --report_ids '[1001]' --request_id mcp_ffffffffffffffffffffffffffffffff --timeout_minutes 8
ae-cli analysis +query_dashboard_report_data --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_id` / `-d` | Yes | Dashboard ID |
| `--filters` | No | Optional filter JSON. If provided, MUST follow `+get_filter_schema`, and referenced fields must come from `analysis_meta +list_properties` in the same `project_id`. |
| `--start_date` | No | Optional start date. Format: yyyy-MM-dd |
| `--end_date` | No | Optional end date. Format: yyyy-MM-dd |
| `--time_granularity` | No | Optional time granularity used to override the report default. Supported values: minute, minute5, minute10, hour, day, week, month, quarter, year, total. |
| `--use_cache` | No | Whether to use cache. Default: true |
| `--report_ids` | No | Optional list of report IDs. If omitted, all reports in the dashboard are queried. |
| `--request_id` | No | Optional unique request ID used for tracking and cancellation. If provided, it must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. For long-running or cancelable queries, provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. The auto-generated requestId is not available when the HTTP request fails before a response, so preset `requestId` is required for proactive cleanup. Generated automatically if omitted. The response `metadata.requestId` can also be passed to `cancel_query` when the query is no longer needed. |
| `--timeout_minutes` | No | Query timeout in minutes. If omitted, 30 minutes is used. |

## Decision Rules
- `filters` cannot be written from experience alone: it must satisfy both the filter schema and the project metadata constraints.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- On the first run, start with only the required parameters (`--project_id`, `--dashboard_id`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--filters '{}'`, `--report_ids '[]'`) to avoid shell escaping issues.
- When dates/time ranges are involved, first verify with a short range, then gradually expand the range.
- For long-running or cancelable queries, supply your own `--request_id` before starting so `+cancel_query` can cancel by the same ID if the caller or user stops waiting. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running; call `+cancel_query --request_id <same value>` with the preset ID. The auto-generated requestId is not available when the HTTP request fails before a response. The value must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--dashboard_id`).
- If `Invalid JSON` appears, first check the filter schema required fields, then verify whether the event/property names come from metadata query results for the same `project_id`.
- If the query times out or results are abnormal, first narrow the time range / grouping dimensions, then split the subqueries to locate the issue.

## Recommended chaining
- +get_filter_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +query_dashboard_report_data
- +list_dashboards -> +query_dashboard_detail -> +query_dashboard_report_data
