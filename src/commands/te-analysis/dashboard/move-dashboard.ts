import { createMcpCommand, optionalNumber } from '../shared.js';

export const moveDashboard = createMcpCommand({
  command: '+move_dashboard',
  description: 'Move a dashboard to a different space or folder. Provide to_space_id to move to a space root, or both to_space_id and to_folder_id to move into a folder within that space.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_id', type: 'number', required: true, desc: 'Dashboard ID to move' },
    { name: 'to_space_id', type: 'number', required: true, desc: 'Target space ID to move the dashboard into' },
    { name: 'to_folder_id', type: 'number', required: false, desc: 'Target folder ID within the target space. Omit to place at the space root.' },
    { name: 'from_space_id', type: 'number', required: false, desc: 'Source space ID the dashboard is currently in. Omit if unknown.' },
    { name: 'from_folder_id', type: 'number', required: false, desc: 'Source folder ID the dashboard is currently in. Omit if unknown.' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    dashboardId: ctx.num('dashboard_id'),
    toSpaceId: ctx.num('to_space_id'),
    toFolderId: optionalNumber(ctx, 'to_folder_id'),
    fromSpaceId: optionalNumber(ctx, 'from_space_id'),
    fromFolderId: optionalNumber(ctx, 'from_folder_id'),
  }),
});
