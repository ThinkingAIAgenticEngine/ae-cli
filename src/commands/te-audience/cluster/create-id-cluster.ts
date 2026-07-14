import { createMcpCommand, optionalNumber, optionalString } from '../shared.js';

export const createIdCluster = createMcpCommand({
  command: '+create_id_cluster',
  description: 'Create an ID cluster by providing CSV file content as plain text. The CSV should contain a single column of user IDs (no header row required). The operation is asynchronous.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'display_name', type: 'string', required: true, desc: 'Cluster display name (1-80 characters)' },
    { name: 'file_content', type: 'string', required: true, desc: 'CSV file content as plain text. No header row, UTF-8 encoding. Each row contains one user ID. Max 100MB.' },
    { name: 'entity_id', type: 'number', required: true, desc: 'Entity ID to associate the cluster with' },
    { name: 'cluster_name', type: 'string', required: false, desc: 'Optional cluster name (lowercase letters, digits, underscores, starts with a letter, max 80 chars). Auto-generated if omitted.' },
    { name: 'remarks', type: 'string', required: false, desc: 'Optional remarks (max 200 characters)' },
    { name: 'main_column_name', type: 'string', required: false, desc: 'Optional main column name for ID matching' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    displayName: ctx.str('display_name'),
    fileContent: ctx.str('file_content'),
    entityId: ctx.num('entity_id'),
    clusterName: optionalString(ctx, 'cluster_name'),
    remarks: optionalString(ctx, 'remarks'),
    mainColumnName: optionalString(ctx, 'main_column_name'),
  }),
});
