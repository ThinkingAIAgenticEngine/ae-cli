import {
  analysisDataRunRoutingHelp,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownEventsRunFlags, drilldownEventsRunInput } from './shared.js';

export const drilldownEventsRun = createAnalysisCapabilityCommand({
  resource: 'drilldown-events',
  command: 'run',
  capabilityId: 'analysis.query.drilldown_events',
  description: `Preview raw events behind one synchronous event-analysis cell whose selected metric advertises drilldown_events. ${analysisDataRunRoutingHelp}`,
  flags: [...drilldownEventsRunFlags],
  risk: 'read',
  buildInput: drilldownEventsRunInput,
});
