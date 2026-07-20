import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, projectReqArgs, readRequiredJsonObject, reqFlag } from './shared.js';

export const batchDeleteFeature = createExperimentCommand({
  command: '+batch_delete_feature',
  description: 'Batch delete Features.',
  flags: [
    PROJECT_ID_FLAG,
    reqFlag('Feature delete request as JSON object'),
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredJsonObject(ctx, 'req');
  },
  buildArgs: projectReqArgs,
});
