import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const data = ctx.json('data');
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('--data must be a JSON object keyed by field_key, e.g. \'{"input":"..."}\' (see +list_dataset_fields)');
  }
  return { data };
}

export const createDatasetCase: Command = {
  service: 'evaluation',
  command: '+create_dataset_case',
  description:
    'Append one case to a dataset via POST /agenteval/api/v1/datasets/{id}/cases. The data object is keyed by field_key from +list_dataset_fields.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'data', type: 'json', required: true, sensitive: true, desc: 'Case data object keyed by field_key, e.g. \'{"input":"...","expected":"..."}\'' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
