import { createMcpCommand, optionalString, requiredJsonString } from '../shared.js';

export const createMetric = createMcpCommand({
  command: '+create_metric',
  description: 'Create a metric from analysis configuration',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'name', type: 'string', required: true, desc: 'Metric name. Must start with a lowercase letter and contain only lowercase letters, digits, and underscores. Maximum length: 80.' },
    { name: 'display_name', type: 'string', required: true, desc: 'Metric display name' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional metric remark' },
    { name: 'model_type', type: 'string', required: true, desc: 'Metric model type: event or retention' },
    { name: 'events', type: 'json', required: true, desc: 'Metric events JSON. Use get_analysis_query_schema first to obtain the schema.' },
    { name: 'params', type: 'json', required: true, desc: 'Metric parameters JSON. For event, use format config; for retention, use the eventView configuration.' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    name: ctx.str('name'),
    displayName: ctx.str('display_name'),
    remark: optionalString(ctx, 'remark'),
    modelType: ctx.str('model_type'),
    events: requiredJsonString(ctx, 'events'),
    params: requiredJsonString(ctx, 'params'),
  }),
});
