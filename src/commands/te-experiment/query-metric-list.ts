import { createExperimentCommand, PROJECT_ID_FLAG, projectArgs } from './shared.js';

export const queryMetricList = createExperimentCommand({
  command: '+query_metric_list',
  description: 'Query the metric list for a project.',
  flags: [PROJECT_ID_FLAG],
  risk: 'read',
  buildArgs: projectArgs,
});
