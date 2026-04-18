import { createMcpCommand } from '../shared.js';

export const getAlertDefinitionSchema = createMcpCommand({
  command: '+get_alert_definition_schema',
  description: 'Get the alert definition schema. Returns field definitions, enum descriptions, and examples for creating or updating alerts.',
  flags: [],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: () => ({}),
});
