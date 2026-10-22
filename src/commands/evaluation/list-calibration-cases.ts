import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/calibration-suites';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases`;
}

export const listCalibrationCases: Command = {
  service: 'evaluation',
  command: '+list_calibration_cases',
  description:
    'List active Golden Cases of a calibration suite via GET /agenteval/api/v1/calibration-suites/{id}/cases.',
  flags: [...evalFlags(), idFlag('Calibration suite UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
