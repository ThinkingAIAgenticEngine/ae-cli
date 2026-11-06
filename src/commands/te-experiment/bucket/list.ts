import { createExperimentCapabilityCommand } from '../capability-shared.js';

/** Lists split buckets in a project. */
export const bucketList = createExperimentCapabilityCommand({
  resource: 'bucket', command: 'list', capabilityId: 'experiment.bucket.list',
  description: 'List split buckets in a project.',
  flags: [{ name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' }],
  risk: 'read',
  buildInput: (ctx) => ({ project_id: ctx.num('project-id') }),
});
