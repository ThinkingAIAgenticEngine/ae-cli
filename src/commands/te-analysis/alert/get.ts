import {
  alertIdFlag,
  alertIdInput,
  createAnalysisCapabilityCommand,
  projectIdFlag,
} from './shared.js';

export const analysisAlertGet = createAnalysisCapabilityCommand({
  resource: 'alert',
  command: 'get',
  capabilityId: 'analysis.alert.get',
  description: 'Get one alert.',
  flags: [projectIdFlag, alertIdFlag],
  risk: 'read',
  buildInput: alertIdInput,
});
