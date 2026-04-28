import { createMcpCommand, optionalJson, optionalNumber, optionalString } from '../shared.js';

export const listProjectMarkTimes = createMcpCommand({
  command: '+list_project_mark_times',
  description: 'List project date markers. Query performs fuzzy matching on markContent. Supports fields/limit/offset pagination.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Marker time zone offset' },
    { name: 'query', type: 'string', required: false, alias: 'q', desc: 'Optional keyword filter. Fuzzy match on markContent.' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported: id, projectId, markTime, userZoneTime, zoneOffset, markContent, isShow, creatorName, creatorId, lastModifierName, lastModifierId, createTime, updateTime.' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional limit. Default: 20, maximum: 50.' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional offset. Default: 0.' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    zoneOffset: optionalNumber(ctx, 'zone_offset'),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
