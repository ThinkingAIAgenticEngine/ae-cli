import { createMcpCommand, optionalBoolean, optionalNumber } from '../shared.js';

export const copyDashboard = createMcpCommand({
  command: '+copy_dashboard',
  description: 'Copy a dashboard to a new dashboard. Optionally copies its associated reports. To place the copy in a space or folder, provide to_space_id or to_folder_id.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_id', type: 'number', required: true, desc: 'Source dashboard ID to copy' },
    { name: 'dashboard_name', type: 'string', required: true, desc: 'Name for the new copied dashboard' },
    { name: 'report_copy', type: 'boolean', required: false, desc: 'Whether to also copy the associated reports. Defaults to false.' },
    { name: 'to_space_id', type: 'number', required: false, desc: 'Target space ID for the copied dashboard. Omit to use the default location.' },
    { name: 'to_folder_id', type: 'number', required: false, desc: 'Target folder ID inside the target space. Omit to place directly in the space root.' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    dashboardId: ctx.num('dashboard_id'),
    dashboardName: ctx.str('dashboard_name'),
    reportCopy: optionalBoolean(ctx, 'report_copy'),
    toSpaceId: optionalNumber(ctx, 'to_space_id'),
    toFolderId: optionalNumber(ctx, 'to_folder_id'),
  }),
});
