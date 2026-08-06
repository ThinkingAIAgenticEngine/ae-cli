import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Lists Features in a project. */
export const featureList = createExperimentCapabilityCommand({
  resource: 'feature', command: 'list', capabilityId: 'experiment.feature.list',
  description: 'List Features in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
