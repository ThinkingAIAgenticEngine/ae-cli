import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/calibration-suites';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/cases`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const variables = ctx.json('variables-json');
  if (variables === null || typeof variables !== 'object' || Array.isArray(variables)) {
    throw new Error('--variables-json must be a JSON object of template variables');
  }
  const tags = ctx.json('tags-json');
  if (!Array.isArray(tags) || tags.length > 20 || !tags.every((v) => typeof v === 'string')) {
    throw new Error('--tags-json must be a JSON array of at most 20 strings');
  }
  return {
    variables,
    expected_score: ctx.num('expected-score'),
    tolerance: ctx.num('tolerance'),
    tags,
  };
}

export const createCalibrationCase: Command = {
  service: 'evaluation',
  command: '+create_calibration_case',
  description:
    'Add a Golden Case to a calibration suite via POST /agenteval/api/v1/calibration-suites/{id}/cases. The case stores variables, an expected score (0-1) and a tolerance (0-1) used to calibrate the evaluator.',
  flags: [
    ...evalFlags(),
    idFlag('Calibration suite UUID'),
    {
      name: 'variables-json',
      type: 'json',
      required: true,
      desc: 'JSON object of template variables rendered into the evaluator template input',
    },
    { name: 'expected-score', type: 'number', required: true, min: 0, max: 1, desc: 'Expected evaluator score (0-1)' },
    { name: 'tolerance', type: 'number', required: true, min: 0, max: 1, desc: 'Allowed deviation from the expected score (0-1)' },
    {
      name: 'tags-json',
      type: 'json',
      required: true,
      desc: 'JSON array of at most 20 tags (each max 64 chars), e.g. \'["golden","regression"]\'',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx), undefined, buildBody(ctx)),
};
