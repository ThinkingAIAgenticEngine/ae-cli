import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Checks whether an experiment is ready for an online transition. */
export const experimentReadyCheck = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'ready-check', capabilityId: 'experiment.experiment.ready-check',
  description: 'Check whether an experiment is ready for an online status transition.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
  ],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), exp_id: ctx.str('exp-id') }),
});
