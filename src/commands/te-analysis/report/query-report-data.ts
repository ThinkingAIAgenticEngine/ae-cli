import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryReportData = createMcpCommand({
  command: '+query_report_data',
  description: 'Query analysis data for one or more reports. Supports extra filters, group-by settings, and time range overrides.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'report_ids', type: 'json', required: true, desc: 'List of report IDs' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional filter JSON. See +get_filter_schema for the structure.' },
    { name: 'group_by', type: 'json', required: false, desc: 'Optional group-by JSON array. See +get_groupby_schema for the structure.' },
    { name: 'request_id', type: 'string', required: false, desc: 'Optional unique request ID. Generated automatically if omitted.' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true' },
    { name: 'start_date', type: 'string', required: false, desc: 'Optional start date in yyyy-MM-dd format' },
    { name: 'end_date', type: 'string', required: false, desc: 'Optional end date in yyyy-MM-dd format' },
    { name: 'time_granularity', type: 'string', required: false, desc: 'Optional time granularity used to override the report default. Supported values: minute, minute5, minute10, hour, day, week, month, quarter, year, total.' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes. If omitted, 30 minutes is used.' },
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
    }),
});
