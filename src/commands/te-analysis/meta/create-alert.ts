import { createMcpCommand, requiredJsonString } from '../shared.js';

export const createAlert = createMcpCommand({
  command: '+create_alert',
  description: 'Create a new alert. After creation, use list_alerts or get_alert to retrieve the created alert.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'definition', type: 'json', required: true, desc: 'Alert definition JSON. See +get_alert_definition_schema for the complete structure.' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    definition: requiredJsonString(ctx, 'definition'),
  }),
});
