import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluator-templates';

export const listEvaluatorTemplates: Command = {
  service: 'evaluation',
  command: '+list_evaluator_templates',
  description:
    'List evaluator templates via GET /agenteval/api/v1/evaluator-templates. Templates provide ready-made judge prompts; reference one by code when creating evaluators with +create_evaluator.',
  flags: [...evalFlags(), { name: 'locale', type: 'string', pattern: '^(zh|en)$', desc: 'Built-in template language: zh | en (server default zh); project templates retain their content' }],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH, { locale: ctx.str('locale') || undefined }),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH, { locale: ctx.str('locale') || undefined }),
};
