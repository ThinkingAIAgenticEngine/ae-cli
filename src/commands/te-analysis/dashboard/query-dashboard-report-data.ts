import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryDashboardReportData = createMcpCommand({
  command: '+query_dashboard_report_data',
  description: 'Query analysis data for one or more reports in a dashboard. Supports additional filters and time range overrides.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_id', type: 'number', required: true, desc: 'Dashboard ID', alias: 'd' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional filter JSON. See +get_filter_schema for the structure.' },
    { name: 'start_date', type: 'string', required: false, desc: 'Optional start date in yyyy-MM-dd format' },
    { name: 'end_date', type: 'string', required: false, desc: 'Optional end date in yyyy-MM-dd format' },
    { name: 'time_granularity', type: 'string', required: false, desc: 'Optional time granularity used to override the report default. Supported values: minute, minute5, minute10, hour, day, week, month, quarter, year, total.' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use cache. Default: true' },
    { name: 'report_ids', type: 'json', required: false, desc: 'Optional report IDs JSON array' },
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
    }),
});
