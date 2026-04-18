import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const queryDashboardDetail = createMcpCommand({
  command: '+query_dashboard_detail',
  description: 'Get detailed information about a specific dashboard including associated reports, dashboard notes, and share members.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_id', type: 'number', required: true, desc: 'Dashboard ID', alias: 'd' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      dashboardId: ctx.num('dashboard_id'),
    }),
});
