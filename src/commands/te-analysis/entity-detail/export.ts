import {
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import {
  entityDetailExportFlags,
  entityDetailExportInput,
} from './shared.js';

export const entityDetailExport = createAnalysisCapabilityCommand({
  resource: 'entity-detail',
  command: 'export',
  capabilityId: 'analysis.entity_detail.export',
  asyncArtifact: true,
  description: 'Export complete entity detail data through the native Trino JSONL or CSV stream as an asynchronous gzip artifact. Default: JSONL.',
  flags: [
    ...entityDetailExportFlags,
  ],
  risk: 'read',
  buildInput: entityDetailExportInput,
});
