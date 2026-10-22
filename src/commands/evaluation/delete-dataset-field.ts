import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag, lockVersionFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/fields/${evalPathId(ctx, 'field-id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteDatasetField: Command = {
  service: 'evaluation',
  command: '+delete_dataset_field',
  description:
    'Remove a field from a dataset via DELETE /agenteval/api/v1/datasets/{id}/fields/{fieldId}. Case data for the field is dropped. Requires the dataset lock_version.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'field-id', type: 'string', required: true, desc: 'Field UUID from +list_dataset_fields' },
    lockVersionFlag('dataset'),
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
