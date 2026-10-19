import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Deletes one experiment metric. */
export const metricDelete = createExperimentCapabilityCommand({
  resource: 'metric', command: 'delete', capabilityId: 'experiment.metric.delete',
  description: 'Delete one experiment metric.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'metric-id', type: 'string', required: true, desc: 'Metric ID.' },
  ],
  risk: 'high-risk-write',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), metric_id: ctx.str('metric-id') }),
});
