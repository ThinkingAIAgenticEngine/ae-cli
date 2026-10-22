import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/files';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getFile: Command = {
  service: 'evaluation',
  command: '+get_file',
  description:
    'Get file metadata via GET /agenteval/api/v1/files/{id}. Completes the export chain: +export_run_results / +export_dataset return a file id, +get_file reads its metadata, +file_download_url mints a temporary download URL.',
  flags: [...evalFlags(), idFlag('File UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
