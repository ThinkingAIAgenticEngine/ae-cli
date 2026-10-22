import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/fields`;
}

export const listDatasetFields: Command = {
  service: 'evaluation',
  command: '+list_dataset_fields',
  description:
    'List the field schema of a dataset via GET /agenteval/api/v1/datasets/{id}/fields (field_key, data_type, ordinal). Needed to build run field mappings and case data payloads.',
  flags: [...evalFlags(), idFlag('Dataset UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
