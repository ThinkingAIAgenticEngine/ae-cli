import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const buildEventDetailsSql = createMcpCommand({
  command: '+build_event_details_sql',
  description: 'Build the SQL for an event details query. The parameters are the same as query_event_details, but this tool returns SQL instead of query results.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'event_name', type: 'string', required: true, desc: 'Event name' },
    { name: 'start_time', type: 'string', required: false, desc: 'Start time. Format: yyyy-MM-dd HH:mm:ss' },
    { name: 'end_time', type: 'string', required: false, desc: 'End time. Format: yyyy-MM-dd HH:mm:ss' },
    { name: 'relative_date_range', type: 'string', required: false, desc: 'Optional relative date range in m-n format. For example, 0-7 means the most recent 7 days including today. Use either this field or start_time/end_time.' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional filter JSON. See +get_filter_schema for the structure.' },
    { name: 'properties', type: 'json', required: false, desc: 'Optional display properties JSON' },
    { name: 'sort_by', type: 'string', required: false, desc: 'Optional sort field' },
    { name: 'sort_order', type: 'string', required: false, desc: 'Optional sort order. Supported values: asc and desc' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional result limit. Default: 100' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Time zone offset. For example, UTC+8 is 8' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      eventName: ctx.str('event_name'),
      startTime: optionalString(ctx, 'start_time'),
      endTime: optionalString(ctx, 'end_time'),
      relativeDateRange: optionalString(ctx, 'relative_date_range'),
      filters: optionalJsonString(ctx, 'filters'),
      properties: optionalJsonString(ctx, 'properties'),
      sortBy: optionalString(ctx, 'sort_by'),
      sortOrder: optionalString(ctx, 'sort_order'),
      limit: optionalNumber(ctx, 'limit'),
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
    }),
});
