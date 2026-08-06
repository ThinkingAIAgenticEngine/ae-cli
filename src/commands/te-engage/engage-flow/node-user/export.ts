import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowUserDetailInput,
  exportFormatFlags,
  flowNodeUserDetailFlags,
  timeoutSecondsFlag,
  validateFlowUserDetailInput,
} from '../report/shared.js';

/** Exports users behind a flow node segment. */
export const nodeUserExport = createEngageFlowCapabilityCommand({
  resource: 'node-user',
  command: 'export',
  capabilityId: 'engage-flow.node-user.export',
  description: 'Export users behind a flow node segment.',
  flags: [...flowNodeUserDetailFlags, ...exportFormatFlags, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowUserDetailInput,
  buildInput: buildFlowUserDetailInput,
});
