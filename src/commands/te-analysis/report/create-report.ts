import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const createReport = createMcpCommand({
  command: '+create_report',
  description: 'Create and persist a new report definition. Supports event, retention, funnel, prop_analysis, path, distribution, sql, interval, and attribution models.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'report_name', type: 'string', required: true, desc: 'Report name. Length: 1-80 characters' },
    { name: 'model_type', type: 'string', required: true, desc: 'Report model type. Supported values: event, retention, funnel, prop_analysis, path, distribution, sql, interval, attribution' },
    { name: 'analysis_query', type: 'json', required: true, desc: 'Report analysis query JSON. Usually includes fields such as events and eventView. See +get_analysis_query_schema for the structure.' },
    { name: 'description', type: 'string', required: false, desc: 'Optional report description' },
    { name: 'cache_seconds', type: 'number', required: false, desc: 'Optional cache duration in seconds' },
    { name: 'query_duration_ms', type: 'number', required: false, desc: 'Optional query duration in milliseconds' },
    { name: 'dashboard_ids', type: 'json', required: false, desc: 'Optional list of dashboard IDs to associate' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      reportName: ctx.str('report_name'),
      modelType: ctx.str('model_type'),
      analysisQuery: requiredJsonString(ctx, 'analysis_query'),
      description: optionalString(ctx, 'description'),
      cacheSeconds: optionalNumber(ctx, 'cache_seconds'),
      queryDurationMs: optionalNumber(ctx, 'query_duration_ms'),
      dashboardIds: optionalJson(ctx, 'dashboard_ids'),
    }),
});
