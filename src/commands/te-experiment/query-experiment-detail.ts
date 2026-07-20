import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    expId: ctx.str('exp_id'),
  };
}

export const queryExperimentDetail = createExperimentCommand({
  command: '+query_experiment_detail',
  description: 'Query full experiment detail.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'exp_id', type: 'string', required: true, desc: 'Experiment ID' },
  ],
  risk: 'read',
  buildArgs,
});
