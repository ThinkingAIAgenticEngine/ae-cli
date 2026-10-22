import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/result-filter-fields`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const resultFilterFields = ctx.json('result-filter-fields-json');
  if (resultFilterFields === undefined) {
    throw new Error("--result-filter-fields-json is required; pass an empty filter as '{\"fields\":[],\"schema_version\":\"RESULT_FILTER_FIELDS_V1\"}'");
  }
  return { result_filter_fields_json: resultFilterFields, lock_version: ctx.num('lock-version') };
}

export const updateRunResultFilterFields: Command = {
  service: 'evaluation',
  command: '+update_run_result_filter_fields',
  description:
    'Set result filter fields on a draft run via PUT /agenteval/api/v1/evaluation-runs/{runId}/result-filter-fields. Required before +start_run even when no filter is needed (pass an empty fields array). Uses the current lock_version from +get_run and increments it.',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
    {
      name: 'result-filter-fields-json',
      type: 'json',
      required: true,
      desc: 'ResultFilterFields JSON (schema_version/fields, max 5). Empty filter: \'{"fields":[],"schema_version":"RESULT_FILTER_FIELDS_V1"}\'',
    },
    {
      name: 'lock-version',
      type: 'number',
      required: true,
      min: 0,
      desc: 'Current run lock_version (optimistic lock), from +get_run',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PUT', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PUT', pathFor(ctx), undefined, buildBody(ctx)),
};
