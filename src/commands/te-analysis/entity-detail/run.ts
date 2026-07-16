import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
  detailPreviewLimitFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import {
  entityDetailBaseFlags,
  entityDetailRunInput,
} from './shared.js';

export const entityDetailRun = createAnalysisCapabilityCommand({
  resource: 'entity-detail',
  command: 'run',
  capabilityId: 'analysis.entity_detail.run',
  description: `Run a bounded entity detail query from a cluster cohort definition. ${analysisDataRunRoutingHelp}`,
  flags: [
    ...entityDetailBaseFlags,
    detailPreviewLimitFlag,
    syncTimeoutSecondsFlag,
  ],
  risk: 'read',
  buildInput: entityDetailRunInput,
  postProcess: applyAnalysisInlineLimit,
});
