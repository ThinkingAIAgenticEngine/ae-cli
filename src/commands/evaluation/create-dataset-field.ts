import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/fields`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { display_name: ctx.str('display-name'), data_type: ctx.str('data-type') };
}

export const createDatasetField: Command = {
  service: 'evaluation',
  command: '+create_dataset_field',
  description:
    'Add a field to a blank dataset via POST /agenteval/api/v1/datasets/{id}/fields. The new field is appended at the end; reorder with +reorder_dataset_fields.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'display-name', type: 'string', required: true, desc: 'Field display name (1-128 characters); field_key is derived from it' },
    { name: 'data-type', type: 'string', required: true, desc: 'Field data type: TEXT | NUMBER | BOOLEAN | JSON | DATE | TIME' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
