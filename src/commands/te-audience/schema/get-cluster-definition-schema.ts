import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getClusterDefinitionSchema = createMcpCommand({
  command: '+get_cluster_definition_schema',
  description: 'Get the cluster definition schema by type and optional response mode',
  flags: [
    { name: 'cluster_type', type: 'string', required: true, desc: 'Cluster type: condition/sql' },
    { name: 'response_mode', type: 'string', required: false, desc: 'Optional response mode: base/examples/full' },
    { name: 'condition_subtype', type: 'string', required: false, desc: 'Optional subtype when cluster_type=condition: core/behavior_seq/all' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      clusterType: ctx.str('cluster_type'),
      responseMode: optionalString(ctx, 'response_mode'),
      conditionSubtype: optionalString(ctx, 'condition_subtype'),
    }),
});
