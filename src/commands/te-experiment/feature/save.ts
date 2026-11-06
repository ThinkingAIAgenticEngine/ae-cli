import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

/** Creates or updates a Feature. */
export const featureSave = createExperimentCapabilityCommand({
  resource: 'feature', command: 'save', capabilityId: 'experiment.feature.save',
  description: 'Create or update a Feature.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Native camelCase Feature save request object.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequiredObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredObject(ctx, 'req') }),
});
