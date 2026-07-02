import { createMcpCommand, optionalString } from '../shared.js';

export const cancelQuery = createMcpCommand({
  command: '+cancel_query',
  description: 'Cancel a running MCP query by request ID. Use this when a previous query is no longer needed, the caller or agent timed out before the query returned, the request returns fetch failed, hits an HTTP timeout, or the user asks to stop waiting. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running; call +cancel_query --request_id <same value> with the requestId supplied before starting the query. For proactive cancellation, generate and pass requestId to the query tool before starting it, then call cancel_query with the same value if you stop waiting.',
  flags: [
    { name: 'request_id', type: 'string', required: true, desc: 'Request ID returned by a query tool in metadata.requestId, or the requestId supplied before starting the query. It must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef.' },
    { name: 'reason', type: 'string', required: false, desc: 'Optional cancellation reason. Default: MCP_CANCEL_QUERY_TOOL.' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
    requestId: ctx.str('request_id'),
    reason: optionalString(ctx, 'reason'),
  }),
});
