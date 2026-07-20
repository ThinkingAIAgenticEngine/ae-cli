import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, readRequiredStringArray } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    expIds: readRequiredStringArray(ctx, 'exp_ids'),
  };
}

export const batchDeleteExperiment = createExperimentCommand({
  command: '+batch_delete_experiment',
  description: 'Batch delete experiments.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'exp_ids', type: 'json', required: true, desc: 'Experiment ID list as JSON array' },
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredStringArray(ctx, 'exp_ids');
  },
  buildArgs,
});
