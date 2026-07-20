import { createExperimentCommand, PROJECT_ID_FLAG, projectArgs } from './shared.js';

export const queryExperimentList = createExperimentCommand({
  command: '+query_experiment_list',
  description: 'Query the experiment list for a project.',
  flags: [PROJECT_ID_FLAG],
  risk: 'read',
  buildArgs: projectArgs,
});
