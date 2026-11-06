import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Lists experiment metrics in a project. */
export const metricList = createExperimentCapabilityCommand({
  resource: 'metric', command: 'list', capabilityId: 'experiment.metric.list',
  description: 'List experiment metrics in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
