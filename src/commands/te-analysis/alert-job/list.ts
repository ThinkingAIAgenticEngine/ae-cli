import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../alert/shared.js';

export const analysisAlertJobList = createAnalysisCapabilityCommand({
  resource: 'alert-job',
  command: 'list',
  capabilityId: 'analysis.alert_job.list',
  description: 'List alert job status.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
