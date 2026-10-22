import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/field-mapping`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const fieldMapping = ctx.json('field-mapping-json');
  if (fieldMapping === undefined) {
    throw new Error('--field-mapping-json is required (schema_version/agent/evaluators, FIELD_MAPPING_V* contract)');
  }
  return { field_mapping_json: fieldMapping, lock_version: ctx.num('lock-version') };
}

export const updateRunFieldMapping: Command = {
  service: 'evaluation',
  command: '+update_run_field_mapping',
  description:
    'Set the field mapping on a draft run via PUT /agenteval/api/v1/evaluation-runs/{runId}/field-mapping. Required before +start_run; the agent input and every evaluator variable must be mapped. Uses the current lock_version and increments it.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Run UUID', 'run'),
    {
      name: 'field-mapping-json',
      type: 'json',
      required: true,
      desc: 'FieldMapping JSON (schema_version/agent/evaluators); V6 adds AGENT_EXECUTION_TRACE and AGENT_TOOL_CALLS for LIVE_AGENT Agent process scoring',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PUT', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PUT', pathFor(ctx), undefined, buildBody(ctx)),
};
