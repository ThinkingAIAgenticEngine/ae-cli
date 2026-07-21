import {
  alertIdFlag,
  alertIdInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from './shared.js';

export const analysisAlertStop = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'stop',
  capabilityId: 'analysis.alert.stop',
  description: 'Stop an alert.',
  flags: [projectIdFlag, alertIdFlag],
  risk: 'write',
  buildInput: alertIdInput,
});
