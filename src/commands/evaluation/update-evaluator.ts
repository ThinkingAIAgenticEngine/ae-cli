import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/evaluators';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    model_config_id: ctx.str('model-config-id'),
    lock_version: ctx.num('lock-version'),
  };
  const description = ctx.str('description');
  if (description) body.description = description;
  const category = ctx.str('category');
  if (category) body.category = category;
  const prompt = ctx.str('prompt');
  if (prompt) body.prompt = prompt;
  const variables = ctx.json('variables');
  if (variables !== undefined) {
    if (!Array.isArray(variables) || !variables.every((v) => typeof v === 'string')) {
      throw new Error("--variables must be a JSON array of strings, e.g. '[\"input\",\"output\"]'");
    }
    body.variables = variables;
  }
  return body;
}

export const updateEvaluator: Command = {
  service: 'evaluation',
  command: '+update_evaluator',
  description:
    'Update an evaluator via PATCH /agenteval/api/v1/evaluators/{id}. Full-replace semantics: pass every field including unchanged ones; drafts become ACTIVE once a model config is bound. Requires the current evaluator lock_version from +get_evaluator.',
  flags: [
    ...evalFlags(),
    ...idAndLockFlags('Evaluator UUID', 'evaluator'),
    { name: 'name', type: 'string', required: true, desc: 'Evaluator name (1-128 characters)' },
    { name: 'model-config-id', type: 'string', required: true, desc: 'Model config UUID that powers the judge' },
    { name: 'description', type: 'string', desc: 'Optional description (<=2000 characters)' },
    { name: 'category', type: 'string', desc: 'Optional category label (<=64 characters)' },
    { name: 'prompt', type: 'string', desc: 'Judge prompt (<=100000 chars) with {{variable}} placeholders' },
    { name: 'variables', type: 'json', desc: 'JSON array of variable names, e.g. \'["input","output"]\'' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'PATCH', pathFor(ctx), undefined, buildBody(ctx)),
};
