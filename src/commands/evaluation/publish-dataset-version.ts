import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/versions`;
}

export const publishDatasetVersion: Command = {
  service: 'evaluation',
  command: '+publish_dataset_version',
  description:
    'Publish an immutable dataset version via POST /agenteval/api/v1/datasets/{id}/versions. Sends {lock_version}. Publishing without changes returns ASSET_VERSION_NO_CHANGES. Published versions can never be overwritten; runs pin them.',
  flags: [...evalFlags(), ...idAndLockFlags('Dataset UUID', 'dataset')],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, { lock_version: ctx.num('lock-version') }),
};
