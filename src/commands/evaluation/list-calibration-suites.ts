import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/calibration-suites`;
}

export const listCalibrationSuites: Command = {
  service: 'evaluation',
  command: '+list_calibration_suites',
  description:
    'List calibration suites of an evaluator via GET /agenteval/api/v1/evaluators/{id}/calibration-suites. The default suite is the recommended container for Golden Cases; avoid creating extra suites without a reason.',
  flags: [...evalFlags(), idFlag('Evaluator UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
