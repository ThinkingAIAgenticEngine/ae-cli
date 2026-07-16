import {
  analysisDataExportRoutingHelp,
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import {
  adhocExportFlags,
  adhocExportInput,
} from './shared.js';

export const adhocExport = createAnalysisCapabilityCommand({
  resource: 'adhoc',
  command: 'export',
  capabilityId: 'analysis.adhoc.export',
  description: `Submit one unified ad-hoc analysis export from an AI-facing model definition. Returns run_id/artifact_id plus the actual format, compression, file_name, content_type, and content_encoding; the artifact-format flag selects logical rows, not compression. The submit response and artifact metadata line contain query_context_id when Redis context creation succeeds. ${analysisDataExportRoutingHelp}`,
  flags: [
    ...adhocExportFlags,
  ],
  risk: 'read',
  buildInput: adhocExportInput,
});
