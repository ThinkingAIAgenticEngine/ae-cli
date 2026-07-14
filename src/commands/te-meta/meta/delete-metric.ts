import { createMcpCommand } from '../shared.js';

export const deleteMetric = createMcpCommand({
  command: '+delete_metric',
  description: 'Delete a metric by metricId',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'metric_id', type: 'number', required: true, desc: 'Metric ID to delete' },
  ],
  risk: 'high-risk-write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    metricId: ctx.num('metric_id'),
  }),
});
