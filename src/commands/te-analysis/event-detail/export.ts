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
  description: 'Export complete event detail data as an asynchronous gzip artifact. The server reads backend pages internally; callers inspect and download one artifact without pagination.',
  flags: [
    ...eventDetailExportFlags,
  ],
  risk: 'read',
  buildInput: eventDetailExportInput,
});
