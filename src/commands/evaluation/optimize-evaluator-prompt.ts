import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/evaluators/prompt-optimization';

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    model_config_id: ctx.str('model-config-id'),
    prompt: ctx.str('prompt'),
  };
}

export const optimizeEvaluatorPrompt: Command = {
  service: 'evaluation',
  command: '+optimize_evaluator_prompt',
  description:
    'Generate an optimized evaluator prompt preview via POST /agenteval/api/v1/evaluators/prompt-optimization. Calls the model and consumes quota (not a pure read). Returns a preview only; it never overwrites an existing evaluator until you apply it explicitly via +update_evaluator.',
  flags: [
    ...evalFlags(),
    { name: 'model-config-id', type: 'string', required: true, desc: 'Model config UUID used to run the optimization' },
    {
      name: 'prompt',
      type: 'string',
      required: true,
      sensitive: true,
      desc: 'Current or draft evaluator prompt to optimize (max 100000 chars); redacted from logs',
    },
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', PATH, undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', PATH, undefined, buildBody(ctx)),
};
