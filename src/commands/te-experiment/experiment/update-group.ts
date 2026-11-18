import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Updates the business group of one experiment. */
export const experimentUpdateGroup = createExperimentCapabilityCommand({
  resource: 'experiment',
  command: 'update-group',
  capabilityId: 'experiment.experiment.update-group',
  description: 'Update the business group of one experiment.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-id', type: 'string', required: true, desc: 'Experiment ID.' },
    {
      name: 'group-id',
      type: 'string',
      required: true,
      desc: 'Target business group ID. Use "0" for ungrouped.',
    },
  ],
  risk: 'write',
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    exp_id: ctx.str('exp-id'),
    group_id: ctx.str('group-id'),
  }),
});
