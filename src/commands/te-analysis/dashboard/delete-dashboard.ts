import { createMcpCommand } from '../shared.js';

export const deleteDashboard = createMcpCommand({
  command: '+delete_dashboard',
  description: 'Delete a dashboard by dashboardId',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_id', type: 'number', required: true, desc: 'Dashboard ID to delete' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    dashboardId: ctx.num('dashboard_id'),
  }),
});
