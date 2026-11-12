import { createExperimentCapabilityCommand, readRequiredObject } from '../capability-shared.js';

/** Batch deletes Features. */
export const featureBatchDelete = createExperimentCapabilityCommand({
  resource: 'feature', command: 'batch-delete', capabilityId: 'experiment.feature.batch-delete',
  description: 'Batch delete Features.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'req', type: 'json', required: true, desc: 'Native camelCase Feature delete request object.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { readRequiredObject(ctx, 'req'); },
  buildInput: (ctx) => ({ project_id: ctx.num('project-id'), req: readRequiredObject(ctx, 'req') }),
});
