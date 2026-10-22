import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

function pathFor(ctx: RuntimeContext): string {
  return `/evaluator-templates/${evalPathId(ctx, 'id')}/enable`;
}

export const enableEvaluatorTemplate: Command = {
  service: 'evaluation',
  resource: 'evaluator-template',
  command: 'enable',
  description: 'Re-enable a project evaluator template. Administrator only; built-in templates cannot be enabled here. Repeated requests succeed without a request body.',
  flags: [
    ...evalFlags(),
    idFlag('Project evaluator template UUID'),
  ],
  risk: 'write',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
