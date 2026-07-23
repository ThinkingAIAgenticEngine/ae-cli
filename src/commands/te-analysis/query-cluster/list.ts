import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const queryClusterList = createAnalysisCapabilityCommand({
  resource: 'query-cluster',
  command: 'list',
  capabilityId: 'analysis.query_cluster.list',
  description: 'List accessible physical query-routing clusters and GLOBAL/SLAVE options. This is not the saved user cohort/cluster catalog.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
