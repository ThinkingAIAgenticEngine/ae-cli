import { createMcpCommand } from '../shared.js';

export const getAlert = createMcpCommand({
  command: '+get_alert',
  description: 'Get detailed information about a specific alert by alertId.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'alert_id', type: 'number', required: true, alias: 'a', desc: 'Alert ID' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    alertId: ctx.num('alert_id'),
  }),
});
