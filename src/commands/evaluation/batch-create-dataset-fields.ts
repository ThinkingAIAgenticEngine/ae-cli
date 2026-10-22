import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/datasets';
const DATA_TYPES = new Set(['TEXT', 'NUMBER', 'BOOLEAN', 'JSON', 'DATE', 'TIME']);

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/fields/batch`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const fields = ctx.json('fields-json');
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 100) {
    throw new CliValidationError('--fields-json must be a JSON array containing 1-100 field definitions');
  }
  for (const field of fields) {
    if (
      field === null ||
      typeof field !== 'object' ||
      Array.isArray(field) ||
      typeof (field as Record<string, unknown>).display_name !== 'string' ||
      !(field as Record<string, unknown>).display_name ||
      String((field as Record<string, unknown>).display_name).length > 128 ||
      !DATA_TYPES.has(String((field as Record<string, unknown>).data_type))
    ) {
      throw new CliValidationError(
        '--fields-json items must contain display_name with 1-128 characters and data_type TEXT | NUMBER | BOOLEAN | JSON | DATE | TIME',
      );
    }
  }
  return { fields };
}

export const batchCreateDatasetFields: Command = {
  service: 'evaluation',
  command: '+batch_create_dataset_fields',
  description:
    'Create 1-100 dataset fields atomically via POST /agenteval/api/v1/datasets/{id}/fields/batch. The request succeeds completely or creates no fields.',
  flags: [
    ...evalFlags(),
    idFlag('Dataset UUID'),
    {
      name: 'fields-json',
      type: 'json',
      required: true,
      desc: 'JSON array of 1-100 field definitions, e.g. \'[{"display_name":"Question","data_type":"TEXT"}]\'',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
