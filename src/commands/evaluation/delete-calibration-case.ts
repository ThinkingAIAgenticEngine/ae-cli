import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/calibration-cases';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const deleteCalibrationCase: Command = {
  service: 'evaluation',
  command: '+delete_calibration_case',
  description:
    'Delete a Golden Case via DELETE /agenteval/api/v1/calibration-cases/{id}. Sends {lock_version} in the body; get the current lock_version from +list_calibration_cases.',
  flags: [...evalFlags(), ...idAndLockFlags('Calibration case UUID', 'calibration case')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
};
