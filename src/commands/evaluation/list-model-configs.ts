import type { Command } from '../../framework/types.js';
import { evalApi, evalDryRun, evalFlags } from './shared.js';

const PATH = '/model-configs';

export const listModelConfigs: Command = {
  service: 'evaluation',
  command: '+list_model_configs',
  description:
    'List model configurations via GET /agenteval/api/v1/model-configs. Returns all model configs (LLM judge backends).',
  flags: [...evalFlags()],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'GET', PATH),
  execute: async (ctx) => evalApi(ctx, 'GET', PATH),
};
