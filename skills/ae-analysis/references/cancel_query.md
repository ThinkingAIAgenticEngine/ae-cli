# analysis +cancel_query (cancel MCP query)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Query lifecycle**

## Use Cases
- Cancel a running MCP query when the user asks to stop waiting.
- Cancel a query when the caller or agent timed out before the query returned but it may still be running on the server.
- Cancel a query by the same `requestId` that was supplied to or returned by a previous query command.
- For proactive cancellation, pass `requestId` to the query tool before starting it, then call `cancel_query` with the same value if you stop waiting.
- If a query returns `fetch failed`, hits an HTTP timeout, or the caller stops waiting, the backend query may still be running; call `+cancel_query --request_id <same value>` with the preset `requestId`.
- auto-generated requestId is not available when the HTTP request fails before a response, so preset `requestId` before any query that may exceed the CLI/MCP HTTP timeout.

## Command
```bash
ae-cli analysis +cancel_query --request_id mcp_0123456789abcdef0123456789abcdef --yes
ae-cli analysis +cancel_query --request_id mcp_0123456789abcdef0123456789abcdef --reason "agent timeout" --yes
ae-cli analysis +cancel_query --request_id mcp_0123456789abcdef0123456789abcdef --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--request_id` | Yes | Request ID returned by a query tool in `metadata.requestId`, or the requestId supplied before starting the query. It must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. |
| `--reason` | No | Optional cancellation reason. Default: `MCP_CANCEL_QUERY_TOOL`. |

## Decision Rules
- This is a write operation. Use `--yes` only when the user clearly asked to cancel or stop a running query.
- The request must belong to the current MCP user. Otherwise the service returns `REQUEST_NOT_FOUND_OR_NOT_OWNED`.
- Do not invent a request ID. Use the ID from the query response or the ID explicitly supplied to the original query.
- This command cancels by request ID only. It does not cancel by SQL text, report ID, dashboard ID, BI panel ID, run ID, or tool call ID.
- For query commands that expose `--request_id`, prefer supplying a stable ID before execution using `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`, so proactive cancellation does not depend on waiting for the response metadata.
- For query commands that may exceed the CLI/MCP HTTP timeout, preset `--request_id`; if `fetch failed`, HTTP timeout, or caller timeout happens, immediately call `+cancel_query --request_id <same value> --yes`.
- For commands that do not expose caller-supplied `request_id`, cancel only if the response includes a request ID.

## Next Steps on Failure
- If `REQUEST_NOT_FOUND_OR_NOT_OWNED` appears, verify the request ID, user identity, host, and whether the original query already finished.
- If cancellation succeeds but the UI still shows stale data, refresh the query status/result surface rather than sending another cancel blindly.
