import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/exports`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { format: ctx.str('export-format') };
}

export const exportDataset: Command = {
  service: 'evaluation',
  command: '+export_dataset',
  description:
    'Export a dataset to a downloadable file via POST /agenteval/api/v1/datasets/{id}/exports. Returns File metadata; fetch the link with +file_download_url.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'export-format', type: 'string', required: true, desc: 'Export format: csv | jsonl' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
