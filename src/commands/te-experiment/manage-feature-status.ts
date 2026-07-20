import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, projectReqArgs, readRequiredJsonObject, reqFlag } from './shared.js';

export const manageFeatureStatus = createExperimentCommand({
  command: '+manage_feature_status',
  description: 'Update Feature status.',
  flags: [
    PROJECT_ID_FLAG,
    reqFlag('Feature status request as JSON object'),
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredJsonObject(ctx, 'req');
  },
  buildArgs: projectReqArgs,
});
