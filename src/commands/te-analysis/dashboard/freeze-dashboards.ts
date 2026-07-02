import { createMcpCommand } from '../shared.js';

export const freezeDashboards = createMcpCommand({
  command: '+freeze_dashboards',
  description: 'Freeze or unfreeze one or more dashboards. freeze=true freezes and takes scheduled jobs offline; freeze=false unfreezes and brings scheduled jobs back online.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'dashboard_ids', type: 'json', required: true, desc: 'List of dashboard IDs to freeze or unfreeze' },
    { name: 'freeze', type: 'boolean', required: true, desc: 'true to freeze, false to unfreeze' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    dashboardIds: ctx.json('dashboard_ids'),
    freeze: ctx.bool('freeze'),
  }),
});
