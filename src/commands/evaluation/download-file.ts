import { resolve } from 'node:path';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalDownload, evalDryRun, evalFlags, idFlag } from './shared.js';

function pathFor(ctx: RuntimeContext): string {
  return `/files/${evalPathId(ctx, 'id')}/content`;
}

export const downloadFile: Command = {
  service: 'evaluation',
  resource: 'file',
  command: 'download',
  description: 'Download a completed, unexpired file through the authenticated API for local or S3 storage. Saves bytes to a new file; returns path and byte_size. Existing files are never overwritten.',
  flags: [
    ...evalFlags(),
    idFlag('File UUID from an import or export operation'),
    { name: 'output', type: 'string', required: true, minLength: 1, desc: 'Destination file path; parent directory must exist and the file must not exist' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({ ...evalDryRun(ctx, 'GET', pathFor(ctx)), output: resolve(ctx.str('output')) }),
  execute: async (ctx) => evalDownload(ctx, pathFor(ctx), ctx.str('output')),
};
