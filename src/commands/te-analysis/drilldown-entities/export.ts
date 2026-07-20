import {
  analysisDataExportRoutingHelp,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownEntitiesExportFlags, drilldownEntitiesExportInput } from './shared.js';

export const drilldownEntitiesExport = createAnalysisCapabilityCommand({
  resource: 'drilldown-entities',
  command: 'export',
  capabilityId: 'analysis.query.drilldown_entities_export',
  description: `Stream all users or custom entities behind one synchronous-preview cell into one csv.gz artifact. ${analysisDataExportRoutingHelp}`,
  flags: [...drilldownEntitiesExportFlags],
  risk: 'read',
  buildInput: drilldownEntitiesExportInput,
});
