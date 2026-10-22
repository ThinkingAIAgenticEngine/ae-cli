import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Lists archived experiments in a project. */
export const experimentListArchived = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'list-archived',
  capabilityId: 'experiment.experiment.list-archived',
  description: 'List archived experiments in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
