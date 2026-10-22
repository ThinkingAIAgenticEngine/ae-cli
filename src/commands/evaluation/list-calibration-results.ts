import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/calibration-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/results`;
}

export const listCalibrationResults: Command = {
  service: 'evaluation',
  command: '+list_calibration_results',
  description:
    'List per-case calibration results of a calibration run via GET /agenteval/api/v1/calibration-runs/{id}/results. Each result compares the evaluator score with the Golden Case expected score and tolerance.',
  flags: [...evalFlags(), idFlag('Calibration run UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
