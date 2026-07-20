import {
  analysisDataExportRoutingHelp,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownEventsExportFlags, drilldownEventsExportInput } from './shared.js';

export const drilldownEventsExport = createAnalysisCapabilityCommand({
  resource: 'drilldown-events',
  command: 'export',
  capabilityId: 'analysis.query.drilldown_events_export',
  description: `Stream all raw events behind one synchronous event-analysis cell into one csv.gz artifact. ${analysisDataExportRoutingHelp}`,
  flags: [...drilldownEventsExportFlags],
  risk: 'read',
  buildInput: drilldownEventsExportInput,
});
