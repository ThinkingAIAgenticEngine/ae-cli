import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowUserDetailInput,
  exportFormatFlags,
  flowUserDetailFlags,
  timeoutSecondsFlag,
  validateFlowUserDetailInput,
} from '../report/shared.js';

/** Exports users behind a flow metric segment. */
export const metricUserExport = createEngageFlowCapabilityCommand({
  resource: 'metric-user',
  command: 'export',
  capabilityId: 'engage-flow.metric-user.export',
  description: 'Export users behind a flow metric segment.',
  flags: [...flowUserDetailFlags, ...exportFormatFlags, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowUserDetailInput,
  buildInput: buildFlowUserDetailInput,
});
