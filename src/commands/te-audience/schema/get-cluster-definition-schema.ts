import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getClusterDefinitionSchema = createMcpCommand({
  command: '+get_cluster_definition_schema',
  description: 'Get the cluster definition schema by cluster type',
  flags: [
    { name: 'cluster_type', type: 'string', required: true, desc: 'Cluster type: condition/sql' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      clusterType: ctx.str('cluster_type'),
    }),
});
