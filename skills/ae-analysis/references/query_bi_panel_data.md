# analysis +query_bi_panel_data (query BI panel data)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **BI panel management**

## Use Cases
- Query released BI panel chart data as one-dimensional `columns` + `rows`.
- Query BI panel summary content as `markdown` + paged `blocks`.
- Apply dashboard-level parameter controls, dashboard-level permission controls, and page chart filter controls using the schema returned by `+get_bi_panel_detail`.

## Mandatory Prerequisite
Call `+get_bi_panel_detail` first unless you already have verified `pageKey`, queryable `chartIds`, returned columns, and control schemas for the same `project_id`, `panel_id`, host, and released version.

## Command
```bash
ae-cli analysis +query_bi_panel_data --project_id <project_id> --panel_id <panel_id> --page_key <page_key> --result_type charts
ae-cli analysis +query_bi_panel_data --project_id <project_id> --panel_id <panel_id> --page_key <page_key> --result_type charts --chart_ids '["chart_city"]' --columns '["city","height"]' --row_limit 50 --row_offset 0
ae-cli analysis +query_bi_panel_data --project_id <project_id> --panel_id <panel_id> --page_key summary --result_type summary --block_limit 20 --block_offset 0
ae-cli analysis +query_bi_panel_data --project_id <project_id> --panel_id <panel_id> --page_key <page_key> --result_type charts --request_id mcp_1234567890abcdef1234567890abcdef --chart_filter_controls '[{"controlId":"chart_filter_city","value":["上海市","北京市"]}]'
ae-cli analysis +query_bi_panel_data --project_id <project_id> --panel_id <panel_id> --page_key <page_key> --result_type charts --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--panel_id` | Yes | BI panel ID returned by `+list_bi_panels` |
| `--page_key` | Yes | Page key returned by `+get_bi_panel_detail` |
| `--result_type` | Yes | `charts` or `summary` |
| `--request_id` | Yes | Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. `requestId` is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`. The response `metadata.requestId` echoes the supplied requestId and can also be passed to `cancel_query(requestId)` when the query is no longer needed. |
| `--chart_ids` | No | JSON array of chart IDs when `result_type=charts`. If omitted, all queryable charts on the page are queried. |
| `--parameter_controls` | No | JSON array of dashboard-level parameter control overrides. Each item has `controlId` and one scalar `value`. |
| `--permission_controls` | No | JSON array of dashboard-level permission control values. Each item has `controlId` and `value`; `value` may be one scalar or an array. |
| `--chart_filter_controls` | No | JSON array of page chart filter control values. Each item has `controlId` and `value`; `value` may be one scalar or an array and applies only to bound charts. |
| `--columns` | No | Optional returned columns for chart data. Must match columns returned by `+get_bi_panel_detail`. |
| `--row_limit` | No | Chart row limit. Default: 50, maximum: 10000. |
| `--row_offset` | No | Chart row offset. Default: 0. |
| `--block_limit` | No | Summary block limit. Default: 20, maximum: 10000. |
| `--block_offset` | No | Summary block offset. Default: 0. |
| `--use_cache` | No | Whether to use cache. Default: true. |
| `--timeout_minutes` | No | Query timeout in minutes. Default: 3, minimum: 1, maximum: 10. |

## Control Rules
- `parameter_controls` accept one scalar value only. Arrays are invalid.
- `permission_controls` accept one scalar value or an array. `allowedValues` from detail are hints only; real data permission is enforced by the BI query path.
- `chart_filter_controls` accept one scalar value or an array regardless of UI single/multi-select setting. They apply only to `boundChartIds`.
- PageCharts filter components that have no passed value and no default do not add a filter.
- Do not pass internal fields such as `paramList`, `permissionFilters`, `visualCfg`, `whereList`, `whereValues`, `field`, `columnName`, `userId`, or `openId`.

## Decision Rules
- For charts, omit `--chart_ids` on the first run to query all queryable charts on the page.
- Explicitly querying a non-queryable filter component returns a chart-level unsupported result.
- Use `--columns`, `--row_limit`, and `--row_offset` to reduce response size.
- Generate and pass `--request_id` before starting any cancelable query; it is required. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running; call `+cancel_query --request_id <same value>` with the preset ID. The value must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Omitted or blank IDs return `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`.

## Recommended Chaining
- `+list_bi_panels` -> `+get_bi_panel_detail` -> `+query_bi_panel_data`
