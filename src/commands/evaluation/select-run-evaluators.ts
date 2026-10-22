import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluation-runs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/evaluators`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const evaluatorIds = ctx.json('evaluator-ids');
  if (!Array.isArray(evaluatorIds) || evaluatorIds.length === 0 || !evaluatorIds.every((v) => typeof v === 'string')) {
    throw new Error('--evaluator-ids must be a non-empty JSON array of evaluator UUIDs, e.g. \'["<uuid>"]\'');
  }
  const body: Record<string, unknown> = { evaluator_ids: evaluatorIds, lock_version: ctx.num('lock-version') };
  const versions = ctx.json('evaluator-versions-json');
  if (versions !== undefined) {
    if (
      !Array.isArray(versions) ||
      !versions.every(
        (v) =>
          v !== null &&
          typeof v === 'object' &&
          !Array.isArray(v) &&
          typeof (v as Record<string, unknown>).evaluator_id === 'string' &&
          typeof (v as Record<string, unknown>).version_id === 'string',
      )
    ) {
      throw new Error(
        '--evaluator-versions-json must be a JSON array of {"evaluator_id":"<uuid>","version_id":"<uuid>"} objects',
      );
    }
    body.evaluator_versions = versions;
  }
  return body;
}

export const selectRunEvaluators: Command = {
  service: 'evaluation',
  command: '+select_run_evaluators',
  description:
    'Bind evaluators to a draft run via PUT /agenteval/api/v1/evaluation-runs/{runId}/evaluators. Required before +start_run; at least one active evaluator must be selected. Prefer pinning published evaluator versions from +list_evaluator_versions; never guess version UUIDs. Uses the current lock_version from +get_run and increments it.',
  flags: [
    ...evalFlags(),
    idFlag('Run UUID'),
    {
      name: 'evaluator-ids',
      type: 'json',
      required: true,
      desc: 'JSON array of evaluator UUIDs to bind, e.g. \'["<uuid-1>","<uuid-2>"]\' (from +list_evaluators)',
    },
    {
      name: 'evaluator-versions-json',
      type: 'json',
      desc: 'Optional JSON array pinning published evaluator versions, e.g. \'[{"evaluator_id":"<uuid>","version_id":"<uuid>"}]\' (from +list_evaluator_versions)',
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
