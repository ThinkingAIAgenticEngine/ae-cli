import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG, readRequiredStringArray } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    layerIds: readRequiredStringArray(ctx, 'layer_ids'),
  };
}

export const batchDeleteTrafficLayer = createExperimentCommand({
  command: '+batch_delete_traffic_layer',
  description: 'Batch delete traffic layers.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'layer_ids', type: 'json', required: true, desc: 'Traffic layer ID list as JSON array' },
  ],
  risk: 'write',
  validate: (ctx: RuntimeContext) => {
    readRequiredStringArray(ctx, 'layer_ids');
  },
  buildArgs,
});
