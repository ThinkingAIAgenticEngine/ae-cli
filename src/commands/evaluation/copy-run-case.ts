import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/${evalPathId(ctx, 'case-run-id')}/copy`;
}

export const copyRunCase: Command = {
  service: 'evaluation',
  command: '+copy_run_case',
  description:
    'Copy a case result as sanitized structured data via POST /agenteval/api/v1/evaluation-runs/{id}/cases/{caseRunId}/copy. Sends no request body; the response is a sanitized CaseRunResult safe for reuse in dataset cases or reports.',
  flags: [
    ...evalFlags(),
    { name: 'id', type: 'string', required: true, desc: 'Run UUID' },
    { name: 'case-run-id', type: 'string', required: true, desc: 'Case run UUID' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
