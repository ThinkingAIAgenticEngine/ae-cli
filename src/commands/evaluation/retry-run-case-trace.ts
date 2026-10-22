import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/${evalPathId(ctx, 'case-run-id')}/trace:retry`;
}

export const retryRunCaseTrace: Command = {
  service: 'evaluation',
  command: '+retry_run_case_trace',
  description:
    'ADMIN-only retry of a failed AI Monitor-backed trace capture via POST /agenteval/api/v1/evaluation-runs/{id}/cases/{caseRunId}/trace:retry. Sends no request body; only retryable captures are accepted.',
  flags: [
    ...evalFlags(),
    { name: 'id', type: 'string', required: true, desc: 'Run UUID' },
    { name: 'case-run-id', type: 'string', required: true, desc: 'Case run UUID' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
