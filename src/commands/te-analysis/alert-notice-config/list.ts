import {
  createAnalysisCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../alert/shared.js';

export const analysisAlertNoticeConfigList = createAnalysisCapabilityCommand({
  resource: 'alert-notice-config',
  command: 'list',
  capabilityId: 'analysis.alert_notice_config.list',
  description: 'List alert notice configs.',
  flags: [projectIdFlag],
  risk: 'read',
  buildInput: projectInput,
});
