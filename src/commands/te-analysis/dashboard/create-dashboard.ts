import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const createDashboard = createMcpCommand({
  command: '+create_dashboard',
  description: 'Create a new dashboard. Optionally associates an initial report after creation and/or creates an initial dashboard note.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_name', type: 'string', required: true, desc: 'Dashboard name' },
    { name: 'space_id', type: 'number', required: false, desc: 'Optional space ID. If provided, the dashboard is created in that space.' },
    { name: 'folder_id', type: 'number', required: false, desc: 'Optional folder ID. If provided, the dashboard is created in that folder.' },
    { name: 'initial_report_id', type: 'number', required: false, desc: 'Optional initial report ID. If provided, the report is automatically associated with the new dashboard after creation.' },
    { name: 'note_title', type: 'string', required: false, desc: 'Optional note title for an initial dashboard note.' },
    { name: 'note_content', type: 'string', required: false, desc: 'Optional note content for an initial dashboard note.' },
    { name: 'note_style', type: 'json', required: false, desc: 'Optional note style configuration JSON for an initial dashboard note.' },
  ],
  risk: 'write',
  buildArgs: (ctx) => ({
      projectId: ctx.num('project_id'),
      dashboardName: ctx.str('dashboard_name'),
      spaceId: optionalNumber(ctx, 'space_id'),
      folderId: optionalNumber(ctx, 'folder_id'),
      initialReportId: optionalNumber(ctx, 'initial_report_id'),
      noteTitle: optionalString(ctx, 'note_title'),
      noteContent: optionalString(ctx, 'note_content'),
      noteStyle: optionalJsonString(ctx, 'note_style'),
    }),
});
