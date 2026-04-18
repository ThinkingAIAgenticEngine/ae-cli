import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const updateCluster = createMcpCommand({
  command: '+update_cluster',
  description: 'Update a user cluster definition',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'cluster_name', type: 'string', required: true, desc: 'Cluster name' },
    { name: 'display_name', type: 'string', required: false, desc: 'New cluster display name. Length: 1-80' },
    { name: 'remark', type: 'string', required: false, desc: 'New cluster remark' },
    { name: 'type', type: 'string', required: false, desc: 'New cluster type: condition/sql. Recommended when updating definition' },
    { name: 'definition', type: 'json', required: false, desc: 'New cluster definition JSON. See +get_cluster_definition_schema' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Optional time zone offset, valid range: -12 to 14' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      clusterName: ctx.str('cluster_name'),
      displayName: optionalString(ctx, 'display_name'),
      remark: optionalString(ctx, 'remark'),
      type: optionalString(ctx, 'type'),
      definition: optionalJsonString(ctx, 'definition'),
      zoneOffset: optionalNumber(ctx, 'zone_offset'),
    }),
});
