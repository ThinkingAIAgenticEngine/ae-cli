import { assertLimitWithinCap, createMcpCommand, DEFAULT_QUERY_LIMIT, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryEntityDetails = createMcpCommand({
  command: '+query_entity_details',
  description: 'Query entity detail data based on an entity ID and cluster definition. Supports display properties, sorting, and result limits. For long-running or cancelable queries, provide requestId before starting. For any query that may exceed the CLI or MCP HTTP timeout, preset requestId so you can call +cancel_query --request_id <same value> if you stop waiting or the request returns fetch failed. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. If provided, requestId must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. Submitted queries return metadata.requestId; pass that value to cancel_query(requestId) when the query is no longer needed. The auto-generated requestId is not available when the HTTP request fails before a response, so preset requestId is required for proactive cleanup.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'entity_id', type: 'number', required: false, desc: 'Optional entity ID used in multi-entity scenarios. If omitted, the default user entity is used.' },
    { name: 'definition', type: 'json', required: true, desc: 'Cluster definition JSON. See +get_cluster_definition_schema for the structure.' },
    { name: 'properties', type: 'json', required: false, desc: 'Optional display properties JSON' },
    { name: 'sort_by', type: 'string', required: false, desc: 'Optional sort field' },
    { name: 'sort_order', type: 'string', required: false, desc: 'Optional sort order. Supported values: asc and desc' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional result limit. Default: 1000, maximum: 10000' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Time zone offset. For example, UTC+8 is 8' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true' },
    { name: 'request_id', type: 'string', required: false, desc: 'Optional unique request ID used for tracking and cancellation. If provided, it must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. For long-running or cancelable queries, provide this before starting the query so it can be cancelled later with +cancel_query --request_id <same value>, even if the caller stops waiting before the tool returns. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. The auto-generated requestId is not available when the HTTP request fails before a response, so preset requestId is required for proactive cleanup. Generated automatically if omitted. The response metadata.requestId can also be passed to cancel_query when the query is no longer needed.' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes. If omitted, 30 minutes is used.' },
  ],
  risk: 'read',
  validate: (ctx) => {
    assertLimitWithinCap(optionalNumber(ctx, 'limit'), 'limit');
  },
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      entityId: optionalNumber(ctx, 'entity_id'),
      definition: requiredJsonString(ctx, 'definition'),
      properties: optionalJsonString(ctx, 'properties'),
      sortBy: optionalString(ctx, 'sort_by'),
      sortOrder: optionalString(ctx, 'sort_order'),
      limit: optionalNumber(ctx, 'limit') ?? DEFAULT_QUERY_LIMIT,
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
      useCache: optionalBoolean(ctx, 'use_cache'),
      requestId: optionalString(ctx, 'request_id'),
      timeoutMinutes: optionalNumber(ctx, 'timeout_minutes'),
    }),
});
