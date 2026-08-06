import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowReportInput,
  flowMetricDetailFlags,
  inlineLimitFlag,
  timeoutSecondsFlag,
  validateFlowReportInput,
} from './shared.js';

/** Queries a flow node metric detail report inline. */
export const flowReportMetricDetailRun = createEngageFlowCapabilityCommand({
  resource: 'report metric-detail',
  command: 'run',
  capabilityId: 'engage-flow.report.metric-detail.run',
  description: 'Query a flow node metric detail report inline.',
  flags: [...flowMetricDetailFlags, inlineLimitFlag, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowReportInput,
  buildInput: buildFlowReportInput,
});
