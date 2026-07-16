import {
  analysisDataExportRoutingHelp,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import { drilldownUsersExportFlags, drilldownUsersExportInput } from './shared.js';

export const drilldownUsersExport = createAnalysisCapabilityCommand({
  resource: 'drilldown-users',
  command: 'export',
  capabilityId: 'analysis.query.drilldown_users.export',
  description: `Export users from a previous analysis query context as a jsonl artifact. ${analysisDataExportRoutingHelp}`,
  flags: [...drilldownUsersExportFlags],
  risk: 'read',
  buildInput: drilldownUsersExportInput,
});
