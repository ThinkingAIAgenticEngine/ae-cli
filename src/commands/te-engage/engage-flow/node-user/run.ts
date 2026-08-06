import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowUserDetailInput,
  flowNodeUserDetailFlags,
  inlineLimitFlag,
  timeoutSecondsFlag,
  validateFlowUserDetailInput,
} from '../report/shared.js';

/** Queries users behind a flow node segment inline. */
export const nodeUserRun = createEngageFlowCapabilityCommand({
  resource: 'node-user',
  command: 'run',
  capabilityId: 'engage-flow.node-user.run',
  description: 'Query users behind a flow node segment inline.',
  flags: [...flowNodeUserDetailFlags, inlineLimitFlag, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowUserDetailInput,
  buildInput: buildFlowUserDetailInput,
});
