import { createMcpCommand, optionalString } from '../shared.js';

export const updateIdCluster = createMcpCommand({
  command: '+update_id_cluster',
  description: 'Update an existing ID cluster by re-uploading CSV file content as plain text. The cluster is identified by cluster_name. The operation is asynchronous.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'cluster_name', type: 'string', required: true, desc: 'Cluster name to update' },
    { name: 'file_content', type: 'string', required: true, desc: 'New CSV file content as plain text. No header row, UTF-8 encoding. Each row contains one user ID. Max 100MB.' },
    { name: 'display_name', type: 'string', required: false, desc: 'Optional new display name' },
    { name: 'remarks', type: 'string', required: false, desc: 'Optional new remarks (max 200 characters)' },
    { name: 'main_column_name', type: 'string', required: false, desc: 'Optional new main column name for ID matching' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    clusterName: ctx.str('cluster_name'),
    fileContent: ctx.str('file_content'),
    displayName: optionalString(ctx, 'display_name'),
    remarks: optionalString(ctx, 'remarks'),
    mainColumnName: optionalString(ctx, 'main_column_name'),
  }),
});
