import {
  alertIdFlag,
  alertIdInput,
  createAnalysisCapabilityCommand,
  definitionFlag,
  projectIdFlag,
} from './shared.js';

export const analysisAlertUpdate = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'update',
  capabilityId: 'analysis.alert.update',
  description: 'Update an alert.',
  flags: [projectIdFlag, alertIdFlag, definitionFlag],
  risk: 'write',
  buildInput: (ctx) => ({ ...alertIdInput(ctx), definition: ctx.json('definition') }),
});
