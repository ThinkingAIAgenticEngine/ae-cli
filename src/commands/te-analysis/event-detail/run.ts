import {
  analysisDataRunRoutingHelp,
  createAnalysisCapabilityCommand,
  previewRowsFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import {
  eventDetailBaseFlags,
  eventDetailRunInput,
} from './shared.js';

export const eventDetailRun = createAnalysisCapabilityCommand({
  resource: 'event-detail',
  command: 'run',
  capabilityId: 'analysis.event_detail.run',
  description: `Run a bounded event detail query from an AI-facing definition. ${analysisDataRunRoutingHelp}`,
  flags: [
    ...eventDetailBaseFlags,
    previewRowsFlag,
    syncTimeoutSecondsFlag,
  ],
  risk: 'read',
  buildInput: eventDetailRunInput,
});
