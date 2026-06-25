import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const listClusterMembers = createMcpCommand({
  command: '+list_cluster_members',
  description: 'List members in the specified cluster with optional query/fields/limit/offset. For long-running or cancelable queries, provide requestId before starting. For any query that may exceed the CLI or MCP HTTP timeout, preset requestId so you can call +cancel_query --request_id <same value> if you stop waiting or the request returns fetch failed. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. If provided, requestId must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. Submitted queries return metadata.requestId; pass that value to cancel_query(requestId) when the query is no longer needed. The auto-generated requestId is not available when the HTTP request fails before a response, so preset requestId is required for proactive cleanup.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'cluster_name', type: 'string', required: true, desc: 'Cluster name' },
    { name: 'property_names', type: 'json', required: false, desc: 'Optional user property name list JSON array' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache, default true' },
    { name: 'query', type: 'string', required: false, desc: 'Optional keyword filter on #user_id and selected properties' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional return field list JSON array' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional page size, default 20, max 10000' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional page offset, default 0' },
    { name: 'request_id', type: 'string', required: false, desc: 'Optional unique request ID used for tracking and cancellation. If provided, it must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. For long-running or cancelable queries, provide this before starting the query so it can be cancelled later with +cancel_query --request_id <same value>, even if the caller stops waiting before the tool returns. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. The auto-generated requestId is not available when the HTTP request fails before a response, so preset requestId is required for proactive cleanup. Generated automatically if omitted. The response metadata.requestId can also be passed to cancel_query when the query is no longer needed.' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes. If omitted, 30 minutes is used.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      clusterName: ctx.str('cluster_name'),
      propertyNames: optionalJson(ctx, 'property_names'),
      useCache: optionalBoolean(ctx, 'use_cache'),
      query: optionalString(ctx, 'query'),
      fields: optionalJson(ctx, 'fields'),
      limit: optionalNumber(ctx, 'limit'),
      offset: optionalNumber(ctx, 'offset'),
      requestId: optionalString(ctx, 'request_id'),
      timeoutMinutes: optionalNumber(ctx, 'timeout_minutes'),
    }),
});
