import { createMcpCommand } from '../shared.js';

export const refreshCluster = createMcpCommand({
  command: '+refresh_cluster',
  description: 'Trigger cluster recomputation asynchronously',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'cluster_name', type: 'string', required: true, desc: 'Cluster name' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    clusterName: ctx.str('cluster_name'),
  }),
});
