import type { Flag } from '../../../framework/types.js';
import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  requestIdFlag,
  syncTimeoutSecondsFlag,
} from '../capability-shared.js';
import { coordinateFlag, sourceFlag, useCacheFlag } from '../query/shared.js';

const queryContextIdFlag: Flag = {
  name: 'query-context-id',
  type: 'string',
  required: true,
  desc: 'query_context_id returned by a synchronous session-analysis preview. Analysis exports never create one.',
};

const sessionPreviewRowsFlag: Flag = {
  name: 'preview-rows',
  type: 'number',
  required: false,
  desc: 'Maximum session or step detail rows returned. Default: 100, max: 1000. 1000 is also the backend session-detail ceiling, so a larger population cannot be completed by paging.',
  min: 1,
  max: 1000,
};

const sessionDetailsRoutingHelp =
  'Routing: --preview-rows bounds returned detail rows; agents should normally pass 100. There is no export variant, so rows beyond the limit are unreachable; narrow the analysis itself and re-run the preview.';

export const drilldownSessionDetailsRun = createAnalysisCapabilityCommand({
  resource: 'drilldown-session-details',
  command: 'run',
  capabilityId: 'analysis.query.drilldown_session_details',
  description: `Preview the individual sessions or steps behind one session-analysis session-count or step-count cell. Session-user and step-user columns drill down with analysis drilldown-entities run instead. ${sessionDetailsRoutingHelp}`,
  flags: [
    projectIdFlag,
    queryContextIdFlag,
    sourceFlag,
    coordinateFlag,
    requestIdFlag,
    useCacheFlag,
    sessionPreviewRowsFlag,
    syncTimeoutSecondsFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    query_context_id: ctx.str('query-context-id'),
    source: optionalJson(ctx, 'source'),
    coordinate: ctx.json('coordinate'),
    request_id: optionalString(ctx, 'request-id'),
    use_cache: optionalBoolean(ctx, 'use-cache'),
    preview_rows: optionalNumber(ctx, 'preview-rows'),
    timeout_seconds: optionalNumber(ctx, 'timeout-seconds'),
  }),
});
