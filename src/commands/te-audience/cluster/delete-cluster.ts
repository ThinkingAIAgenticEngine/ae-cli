import { createMcpCommand, optionalBoolean } from '../shared.js';

export const deleteCluster = createMcpCommand({
  command: '+delete_cluster',
  description: 'Delete a cluster by clusterName. If dependencies exist, shows an influence list and requires --confirmed to proceed.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'cluster_name', type: 'string', required: true, desc: 'Cluster name to delete' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Pass after user explicitly confirms deletion despite listed dependencies' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    clusterName: ctx.str('cluster_name'),
    confirmed: optionalBoolean(ctx, 'confirmed'),
  }),
});
