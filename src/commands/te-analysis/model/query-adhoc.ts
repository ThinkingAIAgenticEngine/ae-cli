import {
  assertLimitWithinCap,
  assertSqlLimitConsistent,
  clusterQueryFlags,
  createMcpCommand,
  optionalBoolean,
  optionalClusterQueryArgs,
  optionalJson,
  optionalJsonString,
  optionalNumber,
  optionalString,
  requiredJsonString,
  resolveSqlAwareLimit,
} from '../shared.js';

export const queryAdhoc = createMcpCommand({
  command: '+query_adhoc',
  description: 'Run ad hoc analysis with an already-built qp. For every non-SQL model, call the matching +build_*_analysis_qp command first and pass its qp; do not handcraft qp or call get_analysis_query_schema/list_events/list_properties/list_metrics/get_metric before the builder. Only SQL uses the schema/verified-definition path. Supports fields/limit/offset pagination. For long-running or cancelable queries, requestId is required and must be provided before starting. For any query that may exceed the CLI or MCP HTTP timeout, generate requestId first so you can call +cancel_query --request_id <same value> if you stop waiting or the request returns fetch failed. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. requestId must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. Submitted queries return metadata.requestId; pass that value to cancel_query(requestId) when the query is no longer needed. requestId is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If requestId is omitted or blank, the backend returns REQUEST_ID_REQUIRED; invalid format returns INVALID_REQUEST_ID.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'model_type', type: 'string', required: true, desc: 'Model type. Supported values: event, retention, funnel, distribution, attribution, heat_map, interval, path, rank_list, prop_analysis, sql.' },
    { name: 'qp', type: 'json', required: true, desc: 'Query parameter JSON. For every non-SQL model, pass qp returned by the matching +build_*_analysis_qp command. Use +get_analysis_query_schema only for SQL.' },
    { name: 'request_id', type: 'string', required: true, desc: 'Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. Provide this before starting the query so it can be cancelled later with +cancel_query --request_id <same value>, even if the caller stops waiting before the tool returns. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. requestId is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns REQUEST_ID_REQUIRED; invalid format returns INVALID_REQUEST_ID. The response metadata.requestId echoes the supplied requestId and can also be passed to cancel_query(requestId) when the query is no longer needed.' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use result cache. Default: true' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Time zone offset in hours. For example, UTC+8 is 8 and UTC-5 is -5' },
    { name: 'is_sort_by_columns', type: 'boolean', required: false, desc: 'Whether to sort query results by columns. Default: false' },
    { name: 'resolve_recent_day', type: 'boolean', required: false, desc: 'Whether to resolve relative time expressions such as last 7 days. If omitted, the service auto-resolves when qp.eventView.recentDay exists and start/end time is incomplete; otherwise it defaults to false.' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Must match column names in result.' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional limit. Default: 1000, maximum: 10000. For model_type=sql, either omit LIMIT in the SQL or keep it equal to --limit (the two must not differ).' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional offset. Default: 0.' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes. If omitted, 30 minutes is used.' },
    ...clusterQueryFlags('Optional cluster query scope. Supported values: GLOBAL, SLAVE. Omit to query the current self cluster. SQL model analysis does not support this parameter.'),
  ],
  risk: 'read',
  validate: (ctx) => {
    const limit = optionalNumber(ctx, 'limit');
    assertLimitWithinCap(limit, 'limit');
    if (ctx.str('model_type') === 'sql') {
      assertSqlLimitConsistent(ctx.json('qp'), limit);
    }
  },
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      modelType: ctx.str('model_type'),
      qp: requiredJsonString(ctx, 'qp'),
      requestId: ctx.str('request_id'),
      useCache: optionalBoolean(ctx, 'use_cache'),
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
      isSortByColumns: optionalBoolean(ctx, 'is_sort_by_columns'),
      resolveRecentDay: optionalBoolean(ctx, 'resolve_recent_day'),
      fields: optionalJson(ctx, 'fields'),
      limit: resolveSqlAwareLimit(optionalNumber(ctx, 'limit'), ctx.str('model_type'), ctx.json('qp')),
      offset: optionalNumber(ctx, 'offset'),
      timeoutMinutes: optionalNumber(ctx, 'timeout_minutes'),
      ...optionalClusterQueryArgs(ctx),
    }),
});
