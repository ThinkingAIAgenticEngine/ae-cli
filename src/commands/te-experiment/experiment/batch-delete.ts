import { createExperimentCapabilityCommand, readRequiredStringArray } from '../capability-shared.js';

/** Batch deletes experiments. */
export const experimentBatchDelete = createExperimentCapabilityCommand({
  resource: 'experiment', command: 'batch-delete', capabilityId: 'experiment.experiment.batch-delete',
  description: 'Batch delete experiments.',
  flags: [
    { name: 'project-id', type: 'number', required: true, alias: 'p', desc: 'Numeric project ID.' },
    { name: 'exp-ids', type: 'json', required: true, desc: 'Experiment IDs as a JSON string array.' },
  ],
  risk: 'high-risk-write',
  validate: (ctx) => { readRequiredStringArray(ctx, 'exp-ids'); },
  buildInput: (ctx) => ({
    project_id: ctx.num('project-id'),
    exp_ids: readRequiredStringArray(ctx, 'exp-ids'),
  }),
});
