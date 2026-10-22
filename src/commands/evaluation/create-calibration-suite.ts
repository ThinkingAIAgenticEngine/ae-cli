import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/calibration-suites`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { name: ctx.str('name') };
  const description = ctx.str('description');
  if (description) body.description = description;
  return body;
}

export const createCalibrationSuite: Command = {
  service: 'evaluation',
  command: '+create_calibration_suite',
  description:
    'Create a calibration suite for an evaluator via POST /agenteval/api/v1/evaluators/{id}/calibration-suites. Prefer the evaluator default suite; create explicit suites only when you need a separate Golden Case set.',
  flags: [
    ...evalFlags(),
    idFlag('Evaluator UUID'),
    { name: 'name', type: 'string', required: true, desc: 'Suite name (1-128 characters)' },
    { name: 'description', type: 'string', desc: 'Optional suite description (max 2000 chars)' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
