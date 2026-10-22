import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag, lockVersionFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/fields/${evalPathId(ctx, 'field-id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { display_name: ctx.str('display-name'), lock_version: ctx.num('lock-version') };
  const ordinal = ctx.optionalNum('ordinal');
  if (ordinal !== undefined) body.ordinal = ordinal;
  return body;
}

export const updateDatasetField: Command = {
  service: 'evaluation',
  command: '+update_dataset_field',
  description:
    'Rename or move a dataset field via PATCH /agenteval/api/v1/datasets/{id}/fields/{fieldId}. Requires the dataset lock_version from +get_dataset (not a per-field version) and increments it.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'field-id', type: 'string', required: true, desc: 'Field UUID from +list_dataset_fields' },
    { name: 'display-name', type: 'string', required: true, desc: 'New field display name (1-128 characters)' },
    { name: 'ordinal', type: 'number', min: 0, desc: 'New zero-based position of the field' },
    lockVersionFlag('dataset'),
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
