import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getClustersByName = createMcpCommand({
  command: '+get_clusters_by_name',
  description: 'Get cluster definition details in batch by cluster names',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'names', type: 'json', required: true, desc: 'Cluster name list JSON array, e.g. ["cluster_a","cluster_b"]' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      names: ctx.json('names'),
    }),
});
