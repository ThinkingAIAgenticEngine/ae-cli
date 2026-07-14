import { createMcpCommand } from '../shared.js';

export const deleteAlert = createMcpCommand({
  command: '+delete_alert',
  description: 'Delete an alert by alertId',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'alert_id', type: 'number', required: true, desc: 'Alert ID to delete' },
  ],
  risk: 'high-risk-write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    alertId: ctx.num('alert_id'),
  }),
});
