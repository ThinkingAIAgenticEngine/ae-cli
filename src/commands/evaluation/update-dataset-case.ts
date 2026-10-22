import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag, lockVersionFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/${evalPathId(ctx, 'case-id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const data = ctx.json('data');
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('--data must be a JSON object keyed by field_key, e.g. \'{"input":"..."}\'');
  }
  return { data, lock_version: ctx.num('lock-version') };
}

export const updateDatasetCase: Command = {
  service: 'evaluation',
  command: '+update_dataset_case',
  description:
    'Replace the field data of one dataset case via PATCH /agenteval/api/v1/datasets/{id}/cases/{caseId}. Requires the case lock_version from +get_dataset_case.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'case-id', type: 'string', required: true, desc: 'Case UUID from +list_dataset_cases' },
    { name: 'data', type: 'json', required: true, sensitive: true, desc: 'New case data object keyed by field_key' },
    lockVersionFlag('case'),
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
