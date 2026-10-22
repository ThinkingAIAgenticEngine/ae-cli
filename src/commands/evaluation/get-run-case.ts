import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/${evalPathId(ctx, 'case-run-id')}`;
}

export const getRunCase: Command = {
  service: 'evaluation',
  command: '+get_run_case',
  description:
    'Get one evaluation case result in full detail via GET /agenteval/api/v1/evaluation-runs/{runId}/cases/{caseRunId}: agent input/output, per-evaluator scores, reasons, and error details. Find caseRunId via +run_cases.',
  flags: [...evalFlags(), idFlag('Run UUID'), { name: 'case-run-id', type: 'string', required: true, desc: 'Case run UUID from +run_cases items[].case_run_id' }],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
