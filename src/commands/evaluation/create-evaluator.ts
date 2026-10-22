import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluators';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = { name: ctx.str('name') };
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
  const modelConfigId = ctx.str('model-config-id');
  if (modelConfigId) body.model_config_id = modelConfigId;
  const templateCode = ctx.str('template-code');
  if (templateCode) body.template_code = templateCode;
  const templateLocale = ctx.str('template-locale');
  if (templateLocale) body.template_locale = templateLocale;
  return body;
}

export const createEvaluator: Command = {
  service: 'evaluation',
  command: '+create_evaluator',
  description:
    'Create an LLM judge evaluator via POST /agenteval/api/v1/evaluators. With --model-config-id it is created ACTIVE; without it a draft is created (activate later with +update_evaluator). The prompt references variables with {{name}} placeholders.',
  flags: [
    ...evalFlags(),
    { name: 'template-locale', type: 'string', pattern: '^(zh|en)$', desc: 'Language copied from built-in templates: zh | en (default zh); project templates are unchanged' },
    { name: 'name', type: 'string', required: true, desc: 'Evaluator name (1-128 characters)' },
    { name: 'description', type: 'string', desc: 'Optional description (<=2000 characters)' },
    { name: 'category', type: 'string', desc: 'Optional category label (<=64 characters), e.g. SAFETY' },
    { name: 'prompt', type: 'string', desc: 'Judge prompt (<=100000 chars) with {{variable}} placeholders matching --variables' },
    { name: 'variables', type: 'json', desc: 'JSON array of variable names, e.g. \'["input","output"]\'' },
    { name: 'model-config-id', type: 'string', desc: 'Model config UUID that powers the judge; omit to create a draft' },
    { name: 'template-code', type: 'string', desc: 'Optional evaluator template code to initialize from (<=64 chars)' },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
