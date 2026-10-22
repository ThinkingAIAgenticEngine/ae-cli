import type { Command, RuntimeContext } from '../../framework/types.js';
import { evalPathId, evalApi, evalDryRun, evalFlags, idFlag } from './shared.js';

const PATH = '/model-configs';

function pathFor(ctx: RuntimeContext): string {
  return `${PATH}/${evalPathId(ctx, 'id')}/test-connectivity`;
}

export const testModelConfigConnectivity: Command = {
  service: 'evaluation',
  command: '+test_model_config_connectivity',
  description:
    'Probe a model configuration with a minimal chat request via POST /agenteval/api/v1/model-configs/{id}/test-connectivity. Verifies base URL, credential, and model name before the config is used by evaluators or runs.',
  flags: [...evalFlags(), idFlag('Model config UUID')],
  risk: 'read',
  dryRun: (ctx) => evalDryRun(ctx, 'POST', pathFor(ctx)),
  execute: async (ctx) => evalApi(ctx, 'POST', pathFor(ctx)),
};
