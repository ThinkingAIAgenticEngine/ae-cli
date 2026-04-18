import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryAdhoc = createMcpCommand({
  command: '+query_adhoc',
  description: 'Run ad hoc analysis for event, retention, funnel, distribution, attribution, heat map, interval, path, rank list, property analysis, or SQL models',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'model_type', type: 'string', required: true, desc: 'Model type. Supported values: event, retention, funnel, distribution, attribution, heat_map, interval, path, rank_list, prop_analysis, sql.' },
    { name: 'qp', type: 'json', required: true, desc: 'Query parameter JSON. Call +get_analysis_query_schema first and keep the time calculation logic consistent with the schema.' },
    { name: 'request_id', type: 'string', required: false, desc: 'Optional unique request ID used for tracking and deduplication. Generated automatically if omitted.' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Whether to use result cache. Default: true' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Time zone offset in hours. For example, UTC+8 is 8 and UTC-5 is -5' },
    { name: 'is_sort_by_columns', type: 'boolean', required: false, desc: 'Whether to sort query results by columns. Default: false' },
    { name: 'resolve_recent_day', type: 'boolean', required: false, desc: 'Whether to resolve relative time expressions such as last 7 days. Default: false' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes. If omitted, 30 minutes is used.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      modelType: ctx.str('model_type'),
      qp: requiredJsonString(ctx, 'qp'),
      requestId: optionalString(ctx, 'request_id'),
      useCache: optionalBoolean(ctx, 'use_cache'),
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
      isSortByColumns: optionalBoolean(ctx, 'is_sort_by_columns'),
      resolveRecentDay: optionalBoolean(ctx, 'resolve_recent_day'),
      timeoutMinutes: optionalNumber(ctx, 'timeout_minutes'),
    }),
});
