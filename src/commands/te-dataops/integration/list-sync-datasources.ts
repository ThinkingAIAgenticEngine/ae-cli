import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_list_sync_datasources';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    env: ctx.str('env'),
  };
}

export const listSyncDatasources: Command = {
  service: 'dataops_integration',
  command: '+list_sync_datasources',
  description: 'List datasources usable by sync solutions. Required: spaceCode. Optional: env (DEV default or PROD). Returns sourceComponentSet and sinkComponentSet grouped by component, with dataSourceList and supportableComponent.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: DEV (default) or PROD' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
