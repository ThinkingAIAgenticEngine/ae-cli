import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_get_datasource_detail';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    dataSourceName: ctx.str('datasourceName'),
  };
}

export const getDatasourceDetail: Command = {
  service: 'dataops_integration',
  command: '+get_datasource_detail',
  description: 'Get one datasource detail by exact name. Required: spaceCode, datasourceName. Returns datasourceId, dataSourceComponentName, dataSourceName, dataSourceRemark, dataSourceStatus, connectStatus, syncTaskNum, sharedConfig, masked connectConfig, connectFails, and lastConnectTime.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceName', type: 'string', required: true, desc: 'Exact datasource name within the space' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
