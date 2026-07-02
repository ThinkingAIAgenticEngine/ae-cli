# analysis_audience +list_tag_members (View Tag Members)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Tag Management**

## Use Cases
- List members in the specified tag.
- Supports payload governance parameters: `query`, `fields`, `limit`, `offset`.
- Returns a paginated envelope (items + total + limit + offset + hasMore) for the selected snapshot date.

## Commands
```bash
ae-cli analysis_audience +list_tag_members --project_id <project_id> --tag_name demo
ae-cli analysis_audience +list_tag_members --project_id <project_id> --tag_name demo --snapshot_date 2026-04-01 --property_names '["#user_id","name"]' --use_cache false
ae-cli analysis_audience +list_tag_members --project_id <project_id> --tag_name demo --query user_001 --fields '["#user_id","name"]' --limit 20 --offset 0 --request_id mcp_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb --timeout_minutes 8
ae-cli analysis_audience +list_tag_members --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--tag_name` | Yes | Tag name |
| `--snapshot_date` | No | Optional tag snapshot date. Format: YYYY-MM-DD |
| `--property_names` | No | Optional list of user property names (JSON array) |
| `--use_cache` | No | Whether to use cache. Default: true |
| `--query` | No | Optional keyword filter on `#user_id` and selected properties. |
| `--fields` | No | Optional return field list (JSON array). Invalid fields will fail with `INVALID_FIELDS`. |
| `--limit` | No | Optional page size. Default: 20, max: 50. |
| `--offset` | No | Optional page offset. Default: 0. |
| `--request_id` | Yes | Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. `requestId` is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`. The response `metadata.requestId` echoes the supplied requestId and can also be passed to `cancel_query(requestId)` when the query is no longer needed. |
| `--timeout_minutes` | No | Query timeout in minutes. If omitted, 30 minutes is used. |

## Decision Rules
- For the first execution, include all required parameters (`--project_id`, `--tag_name`, `--request_id`) and add optional parameters after confirming the path works.
- `--property_names` must be passed as a JSON array (e.g. `--property_names '["#user_id"]'`).
- Generate and pass `--request_id` before starting any cancelable query; it is required. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running; call `+cancel_query --request_id <same value>` with the preset ID. The value must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Omitted or blank IDs return `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--tag_name`, `--request_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_tags -> +get_tags_by_name -> +update_tag
