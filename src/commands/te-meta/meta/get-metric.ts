import { createMcpCommand } from '../shared.js';

export const getMetric = createMcpCommand({
  command: '+get_metric',
  description: 'Get the definition details of a single metric. Use for metric metadata inspection/management. For AI-facing analysis definitions, reference saved metrics by verified metric name instead of calling old QP builders.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'metric_id', type: 'number', required: true, alias: 'm', desc: 'Metric ID' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    metricId: ctx.num('metric_id'),
  }),
});
