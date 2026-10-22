import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/model-configs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}`;
}

export const getModelConfig: Command = {
  service: 'evaluation',
  command: '+get_model_config',
  description:
    'Get one model configuration by id via GET /agenteval/api/v1/model-configs/{modelConfigId}.',
  flags: [...evalFlags(), idFlag('Model config UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'GET', pathFor(ctx)),
};
