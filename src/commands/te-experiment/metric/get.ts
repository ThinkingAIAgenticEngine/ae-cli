import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Gets one experiment metric by ID. */
export const metricGet = createExperimentCapabilityCommand({
  resource: 'metric', command: 'get', capabilityId: 'experiment.metric.get',
  description: 'Get one experiment metric by ID.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'metric-id', type: 'string', required: true, desc: 'Metric ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), metric_id: ctx.str('metric-id') }),
});
