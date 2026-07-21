import {
  alertIdFlag,
  alertIdInput,
  compactInput,
  createAnalysisCapabilityCommand,
  endTimeFlag,
  optionalString,
  projectIdFlag,
  startTimeFlag,
} from '../alert/shared.js';

export const analysisAlertDetailList = createAnalysisCapabilityCommand({
  resource: 'alert-detail',
  command: 'list',
  capabilityId: 'analysis.alert_detail.list',
  description: 'List alert delivery details.',
  flags: [projectIdFlag, alertIdFlag, startTimeFlag, endTimeFlag],
  risk: 'read',
  buildInput: (ctx) => compactInput({ ...alertIdInput(ctx), start_time: optionalString(ctx, 'start-time'), end_time: optionalString(ctx, 'end-time') }),
});
