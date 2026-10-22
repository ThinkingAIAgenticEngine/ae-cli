import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/${evalPathId(ctx, 'case-id')}`;
}

export const getDatasetCase: Command = {
  service: 'evaluation',
  command: '+get_dataset_case',
  description:
    'Get one dataset case with its full field data via GET /agenteval/api/v1/datasets/{id}/cases/{caseId}. Find caseId via +list_dataset_cases.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    { name: 'case-id', type: 'string', required: true, desc: 'Case UUID from +list_dataset_cases' },
  ],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
