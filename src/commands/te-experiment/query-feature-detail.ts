import type { RuntimeContext } from '../../framework/types.js';
import { addOptionalString, createExperimentCommand, PROJECT_ID_FLAG } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  const args: Record<string, any> = {
    projectId: ctx.num('project_id'),
    featureKey: ctx.str('feature_key'),
  };
  addOptionalString(args, ctx, 'version', 'version');
  return args;
}

export const queryFeatureDetail = createExperimentCommand({
  command: '+query_feature_detail',
  description: 'Query Feature detail by key and optional version.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'feature_key', type: 'string', required: true, desc: 'Feature key' },
    { name: 'version', type: 'string', required: false, desc: 'Feature version ID' },
  ],
  risk: 'read',
  buildArgs,
});
