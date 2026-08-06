import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowReportInput,
  exportFormatFlags,
  flowMetricDetailFlags,
  timeoutSecondsFlag,
  validateFlowReportInput,
} from './shared.js';

/** Exports a flow node metric detail report artifact. */
export const flowReportMetricDetailExport = createEngageFlowCapabilityCommand({
  resource: 'report metric-detail',
  command: 'export',
  capabilityId: 'engage-flow.report.metric-detail.export',
  description: 'Export a flow node metric detail report artifact.',
  flags: [...flowMetricDetailFlags, ...exportFormatFlags, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowReportInput,
  buildInput: buildFlowReportInput,
});
