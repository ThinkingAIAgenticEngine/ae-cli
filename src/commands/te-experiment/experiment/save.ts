import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

/** Creates or updates an experiment draft. */
export const experimentSave = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'save', capabilityId: 'experiment.experiment.save',
  description: 'Create or update an experiment draft.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Native camelCase experiment save request object.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequiredObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredObject(ctx, 'req') }),
});
