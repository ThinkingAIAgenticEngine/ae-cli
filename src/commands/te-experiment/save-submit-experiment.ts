import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, projectReqArgs, readRequiredJsonObject, reqFlag } from './shared.js';

export const saveSubmitExperiment = createExperimentCommand({
  command: '+save_submit_experiment',
  description: 'Create or update a complete experiment and submit it.',
  flags: [
    PROJECT_ID_FLAG,
    reqFlag('Experiment save-and-submit request as JSON object'),
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredJsonObject(ctx, 'req');
  },
  buildArgs: projectReqArgs,
});
