import {
  createAnalysisCapabilityCommand,
  definitionFlag,
  projectIdFlag,
  projectInput,
} from './shared.js';

export const analysisAlertCreate = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'create',
  capabilityId: 'analysis.alert.create',
  description: 'Create an alert.',
  flags: [projectIdFlag, definitionFlag],
  risk: 'write',
  buildInput: (ctx) => ({ ...projectInput(ctx), definition: ctx.json('definition') }),
});
