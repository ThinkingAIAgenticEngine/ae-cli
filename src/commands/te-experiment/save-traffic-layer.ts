import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, projectReqArgs, readRequiredJsonObject, reqFlag } from './shared.js';

export const saveTrafficLayer = createExperimentCommand({
  command: '+save_traffic_layer',
  description: 'Create or update a traffic layer.',
  flags: [
    PROJECT_ID_FLAG,
    reqFlag('Traffic layer save request as JSON object'),
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredJsonObject(ctx, 'req');
  },
  buildArgs: projectReqArgs,
});
