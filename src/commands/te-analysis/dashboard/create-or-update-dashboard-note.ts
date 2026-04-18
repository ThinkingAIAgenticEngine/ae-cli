import { createMcpCommand, optionalJsonString, optionalNumber, optionalString } from '../shared.js';

export const createOrUpdateDashboardNote = createMcpCommand({
  command: '+create_or_update_dashboard_note',
  description: 'Create a new dashboard note or update an existing one. If noteId is provided, updates the existing note; otherwise creates a new note.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'dashboard_id', type: 'number', required: true, alias: 'd', desc: 'Dashboard ID' },
    { name: 'note_id', type: 'number', required: false, desc: 'Optional note ID. If provided, updates the existing note; otherwise creates a new note.' },
    { name: 'note_title', type: 'string', required: true, desc: 'Note title' },
    { name: 'description', type: 'string', required: false, desc: 'Optional note description content.' },
    { name: 'ui_config', type: 'json', required: false, desc: 'Optional UI configuration JSON string for the note style.' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    dashboardId: ctx.num('dashboard_id'),
    noteId: optionalNumber(ctx, 'note_id'),
    noteTitle: ctx.str('note_title'),
    description: optionalString(ctx, 'description'),
    uiConfig: optionalJsonString(ctx, 'ui_config'),
  }),
});
