import { createMcpCommand } from '../shared.js';

export const getMetric = createMcpCommand({
  command: '+get_metric',
  description: 'Get the definition details of a single metric. Use for metric metadata inspection/management, not as a pre-step for event ad-hoc builder; pass saved metric names directly to +build_event_analysis_qp in metrics[].event.',
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
