import {
  createAnalysisCapabilityCommand,
  definitionRequestFlag,
  projectIdFlag,
  projectInput,
} from './shared.js';

export const analysisAlertCreate = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'create',
  capabilityId: 'analysis.alert.create',
  description: 'Create an alert.',
  flags: [projectIdFlag, definitionRequestFlag],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), definition_request: ctx.json('definition-request') }),
});
