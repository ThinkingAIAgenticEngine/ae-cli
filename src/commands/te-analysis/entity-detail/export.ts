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
  description: 'Export complete entity detail data as an asynchronous gzip artifact. The server reads backend pages internally; callers inspect and download one artifact without pagination.',
  flags: [
    ...entityDetailExportFlags,
  ],
  risk: 'read',
  buildInput: entityDetailExportInput,
});
