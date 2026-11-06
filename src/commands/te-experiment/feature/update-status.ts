import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

/** Updates a Feature status. */
export const featureUpdateStatus = createExperimentCapabilityCommand({
  resource: 'feature', command: 'update-status', capabilityId: 'experiment.feature.update-status',
  description: 'Update a Feature status.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Native camelCase Feature status request object.' },
  ],
  risk: 'write',
  validate: (ctx) => { readRequiredObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredObject(ctx, 'req') }),
});
