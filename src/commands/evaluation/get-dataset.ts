import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getDataset: Command = {
  service: 'evaluation',
  command: '+get_dataset',
  description:
    'Get one evaluation dataset by id via GET /agenteval/api/v1/datasets/{datasetId}.',
  flags: [...evalFlags(), idFlag('Dataset UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
