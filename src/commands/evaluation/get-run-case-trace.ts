import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/${evalPathId(ctx, 'case-run-id')}/trace`;
}

export const getRunCaseTrace: Command = {
  service: 'evaluation',
  command: '+get_run_case_trace',
  description:
    'Get the immutable normalized execution trace of a case via GET /agenteval/api/v1/evaluation-runs/{id}/cases/{caseRunId}/trace. Only available for LIVE_AGENT runs with subject AGENT; capture status is independent of case success. Traces carry at most 500 spans and may be truncated (PARTIAL is not a complete trajectory). Never echo hidden chain-of-thought, credentials, cookies, auth headers or unredacted tool input/output into reports.',
  flags: [
    ...evalFlags(),
    { name: 'id', type: 'string', required: true, desc: 'Run UUID' },
    { name: 'case-run-id', type: 'string', required: true, desc: 'Case run UUID' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
