import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, projectReqArgs, readRequiredJsonObject, reqFlag } from './shared.js';

export const saveFeature = createExperimentCommand({
  command: '+save_feature',
  description: 'Create or update a Feature.',
  flags: [
    PROJECT_ID_FLAG,
    reqFlag('Feature save request as JSON object'),
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredJsonObject(ctx, 'req');
  },
  buildArgs: projectReqArgs,
});
