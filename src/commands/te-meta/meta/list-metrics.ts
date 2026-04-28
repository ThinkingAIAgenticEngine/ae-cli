import { createMcpCommand, optionalJson, optionalNumber, optionalString } from '../shared.js';

export const listMetrics = createMcpCommand({
  command: '+list_metrics',
  description: 'List metric metadata in the project. Query performs fuzzy matching on metricName, metricDesc, and metricRemark. Supports fields/limit/offset pagination.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'query', type: 'string', required: false, alias: 'q', desc: 'Optional keyword filter. Fuzzy match on metricName, metricDesc, metricRemark.' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported: metricId, metricName, metricDesc, metricRemark, metricMode, openId, creator, creatorLoginName, updateOpenId, updateCreator, updateLoginName, createTime, updateTime.' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional limit. Default: 20, maximum: 50.' },
    { name: 'offset', type: 'number', required: false, desc: 'Optional offset. Default: 0.' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
