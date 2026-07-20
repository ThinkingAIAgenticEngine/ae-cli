import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, projectReqArgs, readRequiredJsonObject, reqFlag } from './shared.js';

export const saveMetric = createExperimentCommand({
  command: '+save_metric',
  description: 'Create or update a metric.',
  flags: [
    PROJECT_ID_FLAG,
    reqFlag('Metric save request as JSON object'),
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredJsonObject(ctx, 'req');
  },
  buildArgs: projectReqArgs,
});
