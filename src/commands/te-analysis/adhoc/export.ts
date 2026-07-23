import {
  analysisDataExportRoutingHelp,
  createAnalysisCapabilityCommand,
  validateClusterQueryRouting,
} from '../capability-shared.js';
import {
  adhocExportFlags,
  adhocExportInput,
} from './shared.js';

export const adhocExport = createAnalysisCapabilityCommand({
  resource: 'adhoc',
  command: 'export',
  capabilityId: 'analysis.adhoc.export',
  description: `Submit one unified ad-hoc analysis export from an AI-facing model definition. Returns run_id/artifact_id plus the actual format, compression, file_name, content_type, and content_encoding. Exports do not create interactive drilldown contexts. ${analysisDataExportRoutingHelp}`,
  flags: [
    ...adhocExportFlags,
  ],
  risk: 'read',
  validate: validateClusterQueryRouting,
  buildInput: adhocExportInput,
});
