import { createMcpCommand, optionalBoolean, optionalNumber, optionalString } from '../shared.js';

export const loadFilters = createMcpCommand({
  command: '+load_filters',
  description: 'Load candidate values for a property from event or user tables. Use quot to specify the property field whose enum values should be loaded.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'quot', type: 'string', required: true, desc: 'Property identifier (field name). This is the property whose candidate values will be loaded.' },
    { name: 'table_type', type: 'string', required: true, desc: 'Table type. Supported values: event and user.' },
    { name: 'event_name', type: 'string', required: false, desc: 'Optional event name. Effective when table_type=event.' },
    { name: 'inputdata', type: 'string', required: false, desc: 'Optional input prefix used for fuzzy filtering of candidate values.' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Time zone offset in hours. For example, UTC+8 is 8' },
    { name: 'cluster_date_policy', type: 'string', required: false, desc: 'Cluster date policy. Supported values: LATEST, AUTO, SPECIFIED.' },
    { name: 'specified_cluster_date', type: 'string', required: false, desc: 'Specified cluster date in yyyy-MM-dd format. Effective only when cluster_date_policy=SPECIFIED.' },
    { name: 'is_report', type: 'boolean', required: false, desc: 'Whether this is report mode. Default: false' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    quot: ctx.str('quot'),
    tableType: ctx.str('table_type'),
    eventName: optionalString(ctx, 'event_name'),
    inputdata: optionalString(ctx, 'inputdata'),
    zoneOffset: optionalNumber(ctx, 'zone_offset'),
    clusterDatePolicy: optionalString(ctx, 'cluster_date_policy'),
    specifiedClusterDate: optionalString(ctx, 'specified_cluster_date'),
    isReport: optionalBoolean(ctx, 'is_report'),
  }),
});
