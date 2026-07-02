import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_list_space_datasources';

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    dataSourceName: ctx.str('datasourceName'),
    componentName: ctx.str('componentName'),
  };
}

export const listSpaceDatasources: Command = {
  service: 'dataops_integration',
  command: '+list_space_datasources',
  description: 'List datasource summaries in a space. Requires spaceCode; datasourceName and componentName are optional filters. Returns datasourceId, dataSourceComponentName, dataSourceName, dataSourceRemark, dataSourceStatus, connectStatus, syncTaskNum, and sharedConfig.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'datasourceName', type: 'string', required: false, desc: 'Optional exact datasource name filter' },
    { name: 'componentName', type: 'string', required: false, desc: 'Optional component type filter, e.g. MySQL or ClickHouse' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
