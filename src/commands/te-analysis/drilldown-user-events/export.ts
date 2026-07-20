import {
  analysisDataExportRoutingHelp,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownUserEventsExportFlags, drilldownUserEventsExportInput } from './shared.js';

export const drilldownUserEventsExport = createAnalysisCapabilityCommand({
  resource: 'drilldown-user-events',
  command: 'export',
  capabilityId: 'analysis.query.drilldown_user_events_export',
  description: `Stream one user's complete event sequence from a drilldown context into one csv.gz artifact. ${analysisDataExportRoutingHelp}`,
  flags: [...drilldownUserEventsExportFlags],
  risk: 'read',
  buildInput: drilldownUserEventsExportInput,
});
