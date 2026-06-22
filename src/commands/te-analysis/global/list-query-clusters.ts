import { createMcpCommand } from '../shared.js';

export const listQueryClusters = createMcpCommand({
  command: '+list_query_clusters',
  description: 'List query cluster options accessible to the current account in the project. Use this to decide whether to query the current self cluster, global aggregated data, or one specific slave cluster.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID used to resolve cluster query permissions', alias: 'p' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
  }),
});
