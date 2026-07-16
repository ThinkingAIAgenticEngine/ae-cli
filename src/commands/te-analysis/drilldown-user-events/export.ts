import {
  analysisDataExportRoutingHelp,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownUserEventsExportFlags, drilldownUserEventsExportInput } from './shared.js';

export const drilldownUserEventsExport = createAnalysisCapabilityCommand({
  resource: 'drilldown-user-events',
  command: 'export',
  capabilityId: 'analysis.query.drilldown_user_events.export',
  description: `Export one user's event sequence from a drilldown context as a jsonl artifact. ${analysisDataExportRoutingHelp}`,
  flags: [...drilldownUserEventsExportFlags],
  risk: 'read',
  buildInput: drilldownUserEventsExportInput,
});
