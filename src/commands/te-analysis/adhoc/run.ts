import {
  analysisDataRunRoutingHelp,
  applyAnalysisInlineLimit,
  createAnalysisCapabilityCommand,
  syncLimitFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import {
  adhocBaseFlags,
  adhocRunInput,
} from './shared.js';

export const adhocRun = createAnalysisCapabilityCommand({
  resource: 'adhoc',
  command: 'run',
  capabilityId: 'analysis.adhoc.run',
  description: `Run one unified ad-hoc analysis from an AI-facing model definition. Supports 12 AI-facing models: 9 common models plus 3 scenario models. Tags and cohorts/clusters are separate capabilities, not ad-hoc model_type values. Returns query_context_id for Redis-backed query follow-ups. ${analysisDataRunRoutingHelp}`,
  flags: [
    ...adhocBaseFlags,
    syncLimitFlag,
    syncTimeoutSecondsFlag,
  ],
  risk: 'read',
  buildInput: adhocRunInput,
  postProcess: applyAnalysisInlineLimit,
});
