import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownUsersRunFlags, drilldownUsersRunInput } from './shared.js';

export const drilldownUsersRun = createAnalysisCapabilityCommand({
  resource: 'drilldown-users',
  command: 'run',
  capabilityId: 'analysis.query.drilldown_users',
  description: `Preview users from a previous analysis query context. Do not pass raw QP. ${analysisDataRunRoutingHelp}`,
  flags: [...drilldownUsersRunFlags],
  risk: 'read',
  buildInput: drilldownUsersRunInput,
  postProcess: applyAnalysisInlineLimit,
});
