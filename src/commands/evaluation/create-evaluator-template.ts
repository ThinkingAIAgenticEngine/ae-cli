import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluator-templates';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: ctx.str('name'),
    category: ctx.str('category'),
    prompt: ctx.str('prompt'),
  };
  const description = ctx.str('description');
  if (description) body.description = description;
  const variables = ctx.json('variables');
  if (variables !== undefined) {
    if (!Array.isArray(variables) || !variables.every((v) => typeof v === 'string')) {
      throw new Error("--variables must be a JSON array of strings, e.g. '[\"input\",\"output\"]'");
    }
    body.variables = variables;
  }
  return body;
}

export const createEvaluatorTemplate: Command = {
  service: 'evaluation',
  command: '+create_evaluator_template',
  description:
    'Create a project evaluator template via POST /agenteval/api/v1/evaluator-templates. Templates hold reusable judge prompts; users create evaluators from them by template code. Requires ADMIN role.',
  flags: [
    ...evalFlags(),
    { name: 'name', type: 'string', required: true, desc: 'Template name (1-128 characters)' },
    { name: 'category', type: 'string', required: true, desc: 'Template category (1-64 characters)' },
    { name: 'prompt', type: 'string', required: true, desc: 'Judge prompt (1-100000 chars) with {{variable}} placeholders' },
    { name: 'description', type: 'string', desc: 'Optional description (<=2000 characters)' },
    { name: 'variables', type: 'json', desc: 'JSON array of variable names, e.g. \'["input","output"]\'' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
