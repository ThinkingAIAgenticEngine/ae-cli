import { clusterQueryFlags, createMcpCommand, optionalBoolean, optionalClusterQueryArgs, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryDashboardReportData = createMcpCommand({
  command: '+query_dashboard_report_data',
  description: 'Query analysis data for one or more reports in a dashboard. Supports additional filters and time range overrides. For long-running or cancelable queries, requestId is required and must be provided before starting. For any query that may exceed the CLI or MCP HTTP timeout, generate requestId first so you can call +cancel_query --request_id <same value> if you stop waiting or the request returns fetch failed. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. requestId must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. Submitted queries return metadata.requestId; pass that value to cancel_query(requestId) when the query is no longer needed. requestId is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If requestId is omitted or blank, the backend returns REQUEST_ID_REQUIRED; invalid format returns INVALID_REQUEST_ID.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_id', type: 'number', required: true, desc: 'Dashboard ID', alias: 'd' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional filter JSON. See +get_filter_schema for the structure.' },
    { name: 'start_date', type: 'string', required: false, desc: 'Optional start date in yyyy-MM-dd format' },
    { name: 'end_date', type: 'string', required: false, desc: 'Optional end date in yyyy-MM-dd format' },
    { name: 'time_granularity', type: 'string', required: false, desc: 'Optional time granularity used to override the report default. Supported values: minute, minute5, minute10, hour, day, week, month, quarter, year, total.' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true' },
    { name: 'report_ids', type: 'json', required: false, desc: 'Optional report IDs JSON array' },
    { name: 'request_id', type: 'string', required: true, desc: 'Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use mcp_<32 lowercase hex UUID>, for example mcp_0123456789abcdef0123456789abcdef. Provide this before starting the query so it can be cancelled later with +cancel_query --request_id <same value>, even if the caller stops waiting before the tool returns. If fetch failed, HTTP timeout, or caller timeout happens, the backend query may still be running. requestId is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns REQUEST_ID_REQUIRED; invalid format returns INVALID_REQUEST_ID. The response metadata.requestId echoes the supplied requestId and can also be passed to cancel_query(requestId) when the query is no longer needed.' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes. If omitted, 30 minutes is used.' },
    ...clusterQueryFlags('Optional cluster query scope. Supported values: GLOBAL, SLAVE. Omit to follow dashboard configuration.'),
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      dashboardId: ctx.num('dashboard_id'),
      filters: optionalJsonString(ctx, 'filters'),
      startDate: optionalString(ctx, 'start_date'),
      endDate: optionalString(ctx, 'end_date'),
      timeGranularity: optionalString(ctx, 'time_granularity'),
      useCache: optionalBoolean(ctx, 'use_cache'),
      reportIds: optionalJson(ctx, 'report_ids'),
      requestId: ctx.str('request_id'),
      timeoutMinutes: optionalNumber(ctx, 'timeout_minutes'),
      ...optionalClusterQueryArgs(ctx),
    }),
});
