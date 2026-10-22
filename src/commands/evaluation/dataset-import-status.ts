import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/import-status`;
}

export const datasetImportStatus: Command = {
  service: 'evaluation',
  command: '+dataset_import_status',
  description:
    'Check the asynchronous import pipeline for a dataset via GET /agenteval/api/v1/datasets/{id}/import-status. Poll this after +import_dataset (which returns 202) until status is READY or IMPORT_FAILED; use +dataset_import_errors for failure details.',
  flags: [...evalFlags(), idFlag('Dataset UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
