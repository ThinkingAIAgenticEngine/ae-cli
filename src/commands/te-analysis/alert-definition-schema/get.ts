import {
  createAnalysisCapabilityCommand,
} from '../alert/shared.js';

export const analysisAlertDefinitionSchemaGet = createAnalysisCapabilityCommand({
  resource: 'alert-definition-schema',
  command: 'get',
  capabilityId: 'analysis.alert_definition_schema.get',
  description: 'Get the alert definition schema.',
  flags: [],
  risk: 'read',
  buildInput: () => ({}),
});
