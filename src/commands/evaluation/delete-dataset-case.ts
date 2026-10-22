import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag, lockVersionFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/${evalPathId(ctx, 'case-id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteDatasetCase: Command = {
  service: 'evaluation',
  command: '+delete_dataset_case',
  description:
    'Delete one case from a dataset via DELETE /agenteval/api/v1/datasets/{id}/cases/{caseId}. Requires the case lock_version from +get_dataset_case.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'case-id', type: 'string', required: true, desc: 'Case UUID from +list_dataset_cases' },
    lockVersionFlag('case'),
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
