import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, projectReqArgs, readRequiredJsonObject, reqFlag } from './shared.js';

export const saveExperiment = createExperimentCommand({
  command: '+save_experiment',
  description: 'Create or update an experiment draft.',
  flags: [
    PROJECT_ID_FLAG,
    reqFlag('Experiment save request as JSON object'),
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredJsonObject(ctx, 'req');
  },
  buildArgs: projectReqArgs,
});
