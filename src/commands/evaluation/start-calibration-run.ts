import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/calibration-suites';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/runs`;
}

export const startCalibrationRun: Command = {
  service: 'evaluation',
  command: '+start_calibration_run',
  description:
    'Queue a calibration run for a suite via POST /agenteval/api/v1/calibration-suites/{id}/runs. Sends no request body; returns the queued calibration run. Poll +get_calibration_run, then +list_calibration_results.',
  flags: [...evalFlags(), idFlag('Calibration suite UUID')],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
