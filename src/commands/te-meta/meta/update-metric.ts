import { createMcpCommand, optionalJsonString, optionalString, requiredJsonString } from '../shared.js';

export const updateMetric = createMcpCommand({
  command: '+update_metric',
  description: 'Update a metric definition',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'metric_id', type: 'number', required: true, alias: 'm', desc: 'Metric ID' },
    { name: 'name', type: 'string', required: true, desc: 'Metric name. Must start with a lowercase letter and contain only lowercase letters, digits, and underscores. Maximum length: 80.' },
    { name: 'display_name', type: 'string', required: true, desc: 'Metric display name' },
    { name: 'remark', type: 'string', required: false, desc: 'Optional metric remark' },
    { name: 'model_type', type: 'string', required: true, desc: 'Metric model type: event or retention' },
    { name: 'events', type: 'json', required: true, desc: 'Metric event definition JSON' },
    { name: 'params', type: 'json', required: false, desc: 'Metric parameter definition JSON' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    metricId: ctx.num('metric_id'),
    name: ctx.str('name'),
    displayName: ctx.str('display_name'),
    remark: optionalString(ctx, 'remark'),
    modelType: ctx.str('model_type'),
    events: requiredJsonString(ctx, 'events'),
    params: optionalJsonString(ctx, 'params'),
  }),
});
