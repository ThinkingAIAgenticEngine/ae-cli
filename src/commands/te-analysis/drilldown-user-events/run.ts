import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownUserEventsRunFlags, drilldownUserEventsRunInput } from './shared.js';

export const drilldownUserEventsRun = createAnalysisCapabilityCommand({
  resource: 'drilldown-user-events',
  command: 'run',
  capabilityId: 'analysis.query.drilldown_user_events',
  description: `Preview one user's event sequence from a drilldown context. Do not pass raw QP. ${analysisDataRunRoutingHelp}`,
  flags: [...drilldownUserEventsRunFlags],
  risk: 'read',
  buildInput: drilldownUserEventsRunInput,
  postProcess: applyAnalysisInlineLimit,
});
