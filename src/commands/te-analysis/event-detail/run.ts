import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
  detailPreviewLimitFlag,
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
    detailPreviewLimitFlag,
    syncTimeoutSecondsFlag,
  ],
  risk: 'read',
  buildInput: eventDetailRunInput,
  postProcess: applyAnalysisInlineLimit,
});
