import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/calibration-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getCalibrationRun: Command = {
  service: 'evaluation',
  command: '+get_calibration_run',
  description:
    'Get a calibration run via GET /agenteval/api/v1/calibration-runs/{id}. Poll until terminal status, then fetch +list_calibration_results.',
  flags: [...evalFlags(), idFlag('Calibration run UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
