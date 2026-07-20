import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    expId: ctx.str('exp_id'),
  };
}

export const checkExperimentReady = createExperimentCommand({
  command: '+check_experiment_ready',
  description: 'Check whether an experiment is ready for online status transitions.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'exp_id', type: 'string', required: true, desc: 'Experiment ID' },
  ],
  risk: 'read',
  buildArgs,
});
