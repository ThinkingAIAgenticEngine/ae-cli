import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/versions/${evalPathId(ctx, 'version-id')}`;
}

export const getDatasetVersion: Command = {
  service: 'evaluation',
  command: '+get_dataset_version',
  description:
    'Get a published dataset version and its frozen fields via GET /agenteval/api/v1/datasets/{id}/versions/{versionId}.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'version-id', type: 'string', required: true, desc: 'Published dataset version UUID' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
