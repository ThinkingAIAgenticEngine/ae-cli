import {
  alertIdFlag,
  alertIdInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from './shared.js';

export const analysisAlertDelete = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'delete',
  capabilityId: 'analysis.alert.delete',
  description: 'Delete an alert.',
  flags: [projectIdFlag, alertIdFlag],
  risk: 'high-risk-write',
  buildInput: alertIdInput,
});
