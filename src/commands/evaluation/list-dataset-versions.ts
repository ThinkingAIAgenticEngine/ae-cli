import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/versions`;
}

export const listDatasetVersions: Command = {
  service: 'evaluation',
  command: '+list_dataset_versions',
  description:
    'List published versions of a dataset via GET /agenteval/api/v1/datasets/{id}/versions. Use a version id with +create_run --dataset-version-id; drafts and published versions are distinct assets.',
  flags: [...evalFlags(), idFlag('Dataset UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
