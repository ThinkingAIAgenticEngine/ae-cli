import { createExperimentCommand, PROJECT_ID_FLAG, projectArgs } from './shared.js';

export const queryFeatureList = createExperimentCommand({
  command: '+query_feature_list',
  description: 'Query the Feature list for a project.',
  flags: [PROJECT_ID_FLAG],
  risk: 'read',
  buildArgs: projectArgs,
});
