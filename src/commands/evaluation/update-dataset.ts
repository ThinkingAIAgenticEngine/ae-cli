import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { name: ctx.str('name'), lock_version: ctx.num('lock-version') };
  const description = ctx.str('description');
  if (description) body.description = description;
  return body;
}

export const updateDataset: Command = {
  service: 'evaluation',
  command: '+update_dataset',
  description:
    'Rename or re-describe a dataset via PATCH /agenteval/api/v1/datasets/{id}. Requires the current dataset lock_version from +get_dataset and increments it.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Dataset UUID', 'dataset'),
    { name: 'name', type: 'string', required: true, desc: 'Dataset name (1-128 characters)' },
    { name: 'description', type: 'string', desc: 'Optional dataset description (<=2000 characters)' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
