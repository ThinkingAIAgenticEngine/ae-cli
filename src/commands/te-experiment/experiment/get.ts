import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Gets one experiment by ID. */
export const experimentGet = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'get', capabilityId: 'experiment.experiment.get',
  description: 'Get one experiment by ID.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), exp_id: ctx.str('exp-id') }),
});
