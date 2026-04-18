import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const updateDashboard = createMcpCommand({
  command: '+update_dashboard',
  description: 'Update dashboard metadata. Supports renaming the dashboard, appending reports, or replacing share members.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_id', type: 'number', required: true, desc: 'Dashboard ID', alias: 'd' },
    { name: 'dashboard_name', type: 'string', required: false, desc: 'New dashboard name. If provided, updates the dashboard name.' },
    { name: 'member_authorities', type: 'json', required: false, desc: 'Map of member userId to permissions (READ, EDIT, MAINTAIN). Full replacement mode.' },
    { name: 'report_ids', type: 'json', required: false, desc: 'List of report IDs to associate with the dashboard. Reports not already associated will be added.' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      dashboardId: ctx.num('dashboard_id'),
      dashboardName: optionalString(ctx, 'dashboard_name'),
      memberAuthorities: optionalJson(ctx, 'member_authorities'),
      reportIds: optionalJson(ctx, 'report_ids'),
    }),
});
