import { clusterQueryFlags, createMcpCommand, optionalBoolean, optionalClusterQueryArgs, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryReportData = createMcpCommand({
  command: '+query_report_data',
  description: 'Query analysis data for one or more reports. Supports extra filters, group-by settings, and time range overrides. For long-running or cancelable queries, provide requestId before starting. For any query that may exceed the CLI or MCP HTTP timeout, preset requestId so you can call +cancel_query --request_id <same value> if you stop waiting or the request returns fetch failed. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. If provided, requestId must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. Submitted queries return metadata.requestId; pass that value to cancel_query(requestId) when the query is no longer needed. The auto-generated requestId is not available when the HTTP request fails before a response, so preset requestId is required for proactive cleanup.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'report_ids', type: 'json', required: true, desc: 'List of report IDs' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional filter JSON. See +get_filter_schema for the structure.' },
    { name: 'group_by', type: 'json', required: false, desc: 'Optional group-by JSON array. See +get_groupby_schema for the structure.' },
    { name: 'request_id', type: 'string', required: false, desc: 'Optional unique request ID used for tracking and cancellation. If provided, it must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. For long-running or cancelable queries, provide this before starting the query so it can be cancelled later with +cancel_query --request_id <same value>, even if the caller stops waiting before the tool returns. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. The auto-generated requestId is not available when the HTTP request fails before a response, so preset requestId is required for proactive cleanup. Generated automatically if omitted. The response metadata.requestId can also be passed to cancel_query when the query is no longer needed.' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true' },
    { name: 'start_date', type: 'string', required: false, desc: 'Optional start date in yyyy-MM-dd format' },
    { name: 'end_date', type: 'string', required: false, desc: 'Optional end date in yyyy-MM-dd format' },
    { name: 'time_granularity', type: 'string', required: false, desc: 'Optional time granularity used to override the report default. Supported values: minute, minute5, minute10, hour, day, week, month, quarter, year, total.' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes. If omitted, 30 minutes is used.' },
    ...clusterQueryFlags('Optional cluster query scope. Supported values: GLOBAL, SLAVE. Omit to query the current self cluster.'),
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      reportIds: ctx.json('report_ids'),
      filters: optionalJsonString(ctx, 'filters'),
      groupBy: optionalJsonString(ctx, 'group_by'),
      requestId: optionalString(ctx, 'request_id'),
      useCache: optionalBoolean(ctx, 'use_cache'),
      startDate: optionalString(ctx, 'start_date'),
      endDate: optionalString(ctx, 'end_date'),
      timeGranularity: optionalString(ctx, 'time_granularity'),
      timeoutMinutes: optionalNumber(ctx, 'timeout_minutes'),
      ...optionalClusterQueryArgs(ctx),
    }),
});
