import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/fields/reorder`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const fieldIds = ctx.json('field-ids');
  if (!Array.isArray(fieldIds) || fieldIds.length === 0 || !fieldIds.every((v) => typeof v === 'string')) {
    throw new Error("--field-ids must be a non-empty JSON array of field UUIDs, e.g. '[\"<uuid-1>\",\"<uuid-2>\"]'");
  }
  return { field_ids: fieldIds, lock_version: ctx.num('lock-version') };
}

export const reorderDatasetFields: Command = {
  service: 'evaluation',
  command: '+reorder_dataset_fields',
  description:
    'Reorder all fields of a dataset via PUT /agenteval/api/v1/datasets/{id}/fields/reorder. The array must contain every field UUID exactly once, in the desired order. Requires the dataset lock_version.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Dataset UUID', 'dataset'),
    {
      name: 'field-ids',
      type: 'json',
      required: true,
      desc: 'JSON array of all field UUIDs in the new order, e.g. \'["<uuid-1>","<uuid-2>"]\'',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PUT', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PUT', pathFor(ctx), undefined, buildBody(ctx)),
};
