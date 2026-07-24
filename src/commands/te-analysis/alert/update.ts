import {
  alertIdFlag,
  alertIdInput,
  createAnalysisCapabilityCommand,
  definitionRequestFlag,
  projectIdFlag,
} from './shared.js';

export const analysisAlertUpdate = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'update',
  capabilityId: 'analysis.alert.update',
  description: 'Update an alert.',
  flags: [projectIdFlag, alertIdFlag, definitionRequestFlag],
  risk: 'write',
  buildInput: (ctx) => ({ ...alertIdInput(ctx), definition_request: ctx.json('definition-request') }),
});
