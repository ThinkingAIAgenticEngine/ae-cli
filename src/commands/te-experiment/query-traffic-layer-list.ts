import { createExperimentCommand, PROJECT_ID_FLAG, projectArgs } from './shared.js';

export const queryTrafficLayerList = createExperimentCommand({
  command: '+query_traffic_layer_list',
  description: 'Query the traffic layer list for a project.',
  flags: [PROJECT_ID_FLAG],
  risk: 'read',
  buildArgs: projectArgs,
});
