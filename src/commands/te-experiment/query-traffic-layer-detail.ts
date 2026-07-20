import type { RuntimeContext } from '../../framework/types.js';
import { createExperimentCommand, PROJECT_ID_FLAG } from './shared.js';

function buildArgs(ctx: RuntimeContext): Record<string, any> {
  return {
    projectId: ctx.num('project_id'),
    layerId: ctx.str('layer_id'),
  };
}

export const queryTrafficLayerDetail = createExperimentCommand({
  command: '+query_traffic_layer_detail',
  description: 'Query traffic layer detail.',
  flags: [
    PROJECT_ID_FLAG,
    { name: 'layer_id', type: 'string', required: true, desc: 'Traffic layer ID' },
  ],
  risk: 'read',
  buildArgs,
});
