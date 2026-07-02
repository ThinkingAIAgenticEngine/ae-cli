import { createMcpCommand, optionalJson, optionalNumber, optionalString } from '../shared.js';

export const listMetrics = createMcpCommand({
  command: '+list_metrics',
  description: 'List metric metadata in the project. Use for metric metadata inspection/management, not as a pre-step for event/retention/funnel/prop_analysis ad-hoc builders. For event saved metric queries, pass the metric name directly to +build_event_analysis_qp in metrics[].event. Query performs fuzzy matching on metricName, metricDesc, and metricRemark. Supports fields/limit/offset pagination. Default returned fields: metricId, metricName, metricDesc, metricRemark, metricMode.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'query', type: 'string', required: false, alias: 'q', desc: 'Optional keyword filter. Fuzzy match on metricName, metricDesc, metricRemark.' },
    { name: 'fields', type: 'json', required: false, desc: 'Optional fields to return. Supported: metricId, metricName, metricDesc, metricRemark, metricMode, openId, creator, creatorLoginName, updateOpenId, updateCreator, updateLoginName, createTime, updateTime. Default fields when omitted: metricId, metricName, metricDesc, metricRemark, metricMode.' },
    { name: 'limit', type: 'number', required: false, desc: 'Optional limit. Default: 20, maximum: 10000.' },
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
