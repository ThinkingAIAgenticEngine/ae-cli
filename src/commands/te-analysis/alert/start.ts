import {
  alertIdFlag,
  alertIdInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from './shared.js';

export const analysisAlertStart = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'start',
  capabilityId: 'analysis.alert.start',
  description: 'Start an alert.',
  flags: [projectIdFlag, alertIdFlag],
  risk: 'write',
  buildInput: alertIdInput,
});
