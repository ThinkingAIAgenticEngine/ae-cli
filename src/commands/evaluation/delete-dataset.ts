import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildParams(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteDataset: Command = {
  service: 'evaluation',
  command: '+delete_dataset',
  description:
    'Delete a dataset and its cases via DELETE /agenteval/api/v1/datasets/{id}. Runs referencing the dataset keep their frozen snapshot. Requires the current dataset lock_version as a query parameter.',
  flags: [...evalFlags(), ...idAndLockFlags('Dataset UUID', 'dataset')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), buildParams(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), buildParams(ctx)),
};
