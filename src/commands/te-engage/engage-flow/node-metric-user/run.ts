import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowUserDetailInput,
  flowNodeUserDetailFlags,
  inlineLimitFlag,
  timeoutSecondsFlag,
  validateFlowUserDetailInput,
} from '../report/shared.js';

/** Queries users behind a flow node metric segment inline. */
export const nodeMetricUserRun = createEngageFlowCapabilityCommand({
  resource: 'node-metric-user',
  command: 'run',
  capabilityId: 'engage-flow.node-metric-user.run',
  description: 'Query users behind a flow node metric segment inline.',
  flags: [...flowNodeUserDetailFlags, inlineLimitFlag, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowUserDetailInput,
  buildInput: buildFlowUserDetailInput,
});
