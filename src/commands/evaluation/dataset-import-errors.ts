import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/import-errors`;
}

export const datasetImportErrors: Command = {
  service: 'evaluation',
  command: '+dataset_import_errors',
  description:
    'Fetch row-level errors from a failed dataset import via GET /agenteval/api/v1/datasets/{id}/import-errors. Only meaningful when +dataset_import_status reports IMPORT_FAILED.',
  flags: [...evalFlags(), idFlag('Dataset UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
