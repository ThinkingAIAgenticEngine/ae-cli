import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/files';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/download-url`;
}

export const fileDownloadUrl: Command = {
  service: 'evaluation',
  command: '+file_download_url',
  description:
    'Create a temporary download URL for a staged file via POST /agenteval/api/v1/files/{fileId}/download-url. Returns download_url and expires_in_seconds; local storage URLs refer to the server filesystem. Use file download for authenticated remote downloads.',
  flags: [...evalFlags(), idFlag('File UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
