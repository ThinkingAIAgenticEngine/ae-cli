import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases/batch`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const cases = ctx.json('cases-json');
  if (!Array.isArray(cases) || cases.length < 1 || cases.length > 1000) {
    throw new CliValidationError('--cases-json must be a JSON array containing 1-1000 case definitions');
  }
  for (const item of cases) {
    const data = item !== null && typeof item === 'object' && !Array.isArray(item)
      ? (item as Record<string, unknown>).data
      : undefined;
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new CliValidationError(
        '--cases-json items must contain a data object keyed by field_key, e.g. \'[{"data":{"input":"..."}}]\'',
      );
    }
  }
  return { cases };
}

export const batchCreateDatasetCases: Command = {
  service: 'evaluation',
  command: '+batch_create_dataset_cases',
  description:
    'Create 1-1000 dataset cases atomically via POST /agenteval/api/v1/datasets/{id}/cases/batch. The request succeeds completely or creates no cases.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    {
      name: 'cases-json',
      type: 'json',
      required: true,
      sensitive: true,
      desc: 'JSON array of 1-1000 case definitions; each data object is keyed by field_key, e.g. \'[{"data":{"input":"..."}}]\'',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
