# analysis +drilldown_user_events (Single-User Event Sequence Drilldown)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model analysis**

## Use Cases
- Drill down to detailed event sequences for a specific user on specific dates.
- This tool is typically used after drilldown_users.
- Common parameters (focus on these): projectId, userId, eventNames, targetDates.
- Advanced parameters (for special scenarios): zoneOffset, properties, timeGranularity, firstDayOfWeek, sortOrder, eventNameFilter, timeFilter, timeFilterBeforeNums, timeFilterAfterNums, entityId, entityValue, useCache, pageNum, pageSize.
- The userId must come from drilldown_users and must not be guessed.
- targetDates is a list of discrete dates, not a date range.
- Constraint: drilldown positioning parameters must come from the previous query result and must not be guessed.
- Constraint: time parameters are passed as an array of discrete time points, not a start/end interval.

## Mandatory prerequisites (MUST)
- Before constructing `--user_id` / `--event_names` / `--target_dates`, you must first read and follow these reference documents:
  - [`./drilldown_users.md`](./drilldown_users.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md) (only when passing `--properties`)
- `user_id` must come from the `+drilldown_users` result; `event_names` / `target_dates` must come from the previous drilldown context or the actual result and must not be guessed.
- Do not execute single-user event sequence drilldown until the upstream drilldown and result readback are complete.

## Prerequisite call chain (required for executing single-user event drilldown)
1. First execute `+drilldown_users` and obtain the target user and drilldown context.
2. Confirm the `user_id`, candidate events, and target discrete time points from the previous step result.
3. If additional property display is needed, first call `analysis_meta +list_properties --project_id <project_id>` to verify property names.
4. Call `+drilldown_user_events` to query the event sequence.

## Command
```bash
ae-cli analysis +drilldown_user_events --project_id <project_id> --user_id u_123 --event_names '["login"]' --target_dates '["2026-04-08 00:00:00"]'
ae-cli analysis +drilldown_user_events --project_id <project_id> --user_id u_123 --event_names '["login"]' --target_dates '["2026-04-08 00:00:00"]' --zone_offset 8 --use_cache true --page_num 1 --page_size 20 --request_id mcp_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
ae-cli analysis +drilldown_user_events --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--user_id` | Yes | User ID from drilldown_users. It must come from drilldown_users and must not be guessed. |
| `--event_names` | Yes | JSON array of event names. Values should come from upstream drilldown context or `analysis_meta +list_events` in the same `project_id`. |
| `--target_dates` | Yes | JSON array of discrete target dates from upstream drilldown context. Not a start/end range. |
| `--zone_offset` | No | Time zone offset. For example, UTC+8 is 8 |
| `--properties` | No | Optional event properties JSON array |
| `--time_granularity` | No | Time granularity: T0/T1/T2/T3/T4/T5/T6/T7 |
| `--first_day_of_week` | No | First day of week: 1-7 |
| `--sort_order` | No | Sort order: asc or desc |
| `--event_name_filter` | No | Optional event name filter |
| `--time_filter` | No | Optional time filter condition |
| `--time_filter_before_nums` | No | Number of records before the time filter point |
| `--time_filter_after_nums` | No | Number of records after the time filter point |
| `--entity_id` | No | Optional entity ID for multi-entity scenarios |
| `--entity_value` | No | Optional entity value for multi-entity scenarios |
| `--use_cache` | No | Whether to use cache. Default: true |
| `--page_num` | No | Start page number, default 1 |
| `--page_size` | No | Page size. Default: 1000, maximum: 10000 |
| `--request_id` | Yes | Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. `requestId` is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`. The response `metadata.requestId` echoes the supplied requestId and can also be passed to `cancel_query(requestId)` when the query is no longer needed. |
| `--timeout_minutes` | No | Query timeout in minutes |

## Decision Rules
- `user_id` / `event_names` / `target_dates` must come from the previous step result and must not be constructed out of thin air.
- On the first run, include all required parameters (`--project_id`,`--user_id`,`--event_names`,`--target_dates`,`--request_id`), and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--event_names '[]'`, `--target_dates '[]'`) to avoid shell escaping issues.
- Generate and pass `--request_id` before starting any cancelable query; it is required. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running; call `+cancel_query --request_id <same value>` with the preset ID. The value must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Omitted or blank IDs return `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--user_id`, `--event_names`, `--target_dates`, `--request_id`).
- If `Invalid JSON` appears, first verify the array structure, then compare it with the previous drilldown result to confirm the values are complete and valid.

## Recommended chaining
- +drilldown_users -> +drilldown_user_events
