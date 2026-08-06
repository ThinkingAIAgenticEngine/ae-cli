import { createEngageFlowCapabilityCommand } from '../../shared.js';
import {
  buildFlowUserDetailInput,
  flowUserDetailFlags,
  inlineLimitFlag,
  timeoutSecondsFlag,
  validateFlowUserDetailInput,
} from '../report/shared.js';

/** Queries users behind a flow metric segment inline. */
export const metricUserRun = createEngageFlowCapabilityCommand({
  resource: 'metric-user',
  command: 'run',
  capabilityId: 'engage-flow.metric-user.run',
  description: 'Query users behind a flow metric segment inline.',
  flags: [...flowUserDetailFlags, inlineLimitFlag, timeoutSecondsFlag],
  risk: 'read',
  validate: validateFlowUserDetailInput,
  buildInput: buildFlowUserDetailInput,
});
