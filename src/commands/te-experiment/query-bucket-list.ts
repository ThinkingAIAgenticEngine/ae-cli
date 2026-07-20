import { createExperimentCommand, PROJECT_ID_FLAG, projectArgs } from './shared.js';

export const queryBucketList = createExperimentCommand({
  command: '+query_bucket_list',
  description: 'Query the split bucket list for a project.',
  flags: [PROJECT_ID_FLAG],
  risk: 'read',
  buildArgs: projectArgs,
});
