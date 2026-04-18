import { createMcpCommand, requiredJsonString } from '../shared.js';

export const updateAlert = createMcpCommand({
  command: '+update_alert',
  description: 'Update an existing alert. All fields in the definition will replace existing values.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'alert_id', type: 'number', required: true, alias: 'a', desc: 'Alert ID' },
    { name: 'definition', type: 'json', required: true, desc: 'Alert definition JSON with updated fields. See +get_alert_definition_schema for the complete structure.' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    alertId: ctx.num('alert_id'),
    definition: requiredJsonString(ctx, 'definition'),
  }),
});
