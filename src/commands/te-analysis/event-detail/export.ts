import {
  createAnalysisCapabilityCommand,
} from '../capability-shared.js';
import {
  eventDetailExportFlags,
  eventDetailExportInput,
} from './shared.js';

export const eventDetailExport = createAnalysisCapabilityCommand({
  resource: 'event-detail',
  command: 'export',
  capabilityId: 'analysis.event_detail.export',
  asyncArtifact: true,
  description: 'Export complete event detail data through the native Trino JSONL or CSV stream as an asynchronous gzip artifact. Default: JSONL.',
  flags: [
    ...eventDetailExportFlags,
  ],
  risk: 'read',
  buildInput: eventDetailExportInput,
});
