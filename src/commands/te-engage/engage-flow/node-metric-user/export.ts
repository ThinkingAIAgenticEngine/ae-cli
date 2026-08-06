import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowUserDetailInput,
  exportFormatFlags,
  flowNodeUserDetailFlags,
  timeoutSecondsFlag,
  validateFlowUserDetailInput,
} from '../report/shared.js';

/** Exports users behind a flow node metric segment. */
export const nodeMetricUserExport = createEngageFlowCapabilityCommand({
  resource: 'node-metric-user',
  command: 'export',
  capabilityId: 'engage-flow.node-metric-user.export',
  description: 'Export users behind a flow node metric segment.',
  flags: [...flowNodeUserDetailFlags, ...exportFormatFlags, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowUserDetailInput,
  buildInput: buildFlowUserDetailInput,
});
