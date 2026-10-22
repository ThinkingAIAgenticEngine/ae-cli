import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/references`;
}

export const listDatasetReferences: Command = {
  service: 'evaluation',
  command: '+list_dataset_references',
  description:
    'List runs referencing a dataset via GET /agenteval/api/v1/datasets/{id}/references. Check this before deleting a dataset or making version/publish decisions; runs keep their frozen snapshot even after the dataset is deleted.',
  flags: [...evalFlags(), idFlag('Dataset UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
