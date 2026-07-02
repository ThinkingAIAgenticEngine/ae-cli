import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_online_datasource';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    dataSourceNames: ctx.str('dataSourceNames'),
  };
}

export const onlineDatasource: Command = {
  service: 'dataops_integration',
  command: '+online_datasource',
  description: 'Online one or more datasources. Requires spaceCode and comma-separated dataSourceNames.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'dataSourceNames', type: 'string', required: true, desc: 'Datasource name list (comma-separated)' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
