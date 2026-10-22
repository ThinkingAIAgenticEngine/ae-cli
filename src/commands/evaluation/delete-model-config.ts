import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idAndLockFlags } from './shared.js';

const PATH = '/model-configs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return { lock_version: ctx.num('lock-version') };
}

export const deleteModelConfig: Command = {
  service: 'evaluation',
  command: '+delete_model_config',
  description:
    'Delete a model configuration via DELETE /agenteval/api/v1/model-configs/{id}. Evaluators and run templates referencing it are unaffected (frozen snapshots) but new bindings fail. Requires the current lock_version.',
  flags: [...evalFlags(), ...idAndLockFlags('Model config UUID', 'model config')],
  risk: 'high-risk-write',
  dryRun: (ctx) => evalDryRun(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
  execute: async (ctx) => evalApi(ctx, 'DELETE', pathFor(ctx), undefined, buildBody(ctx)),
};
