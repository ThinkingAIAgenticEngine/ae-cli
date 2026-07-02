import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'integration_add_sync_solution';

function buildArgs(ctx: RuntimeContext) {
  return {
    spaceCode: ctx.str('spaceCode'),
    syncName: ctx.str('syncName'),
    srcComponent: ctx.str('srcComponent'),
    srcDatasourceId: ctx.str('srcDatasourceId'),
    sinkComponent: ctx.str('sinkComponent'),
    sinkDatasourceId: ctx.str('sinkDatasourceId'),
    sourceConfig: ctx.str('sourceConfig'),
    sinkConfig: ctx.str('sinkConfig'),
    channelConfig: ctx.str('channelConfig'),
    fieldsMapping: ctx.str('fieldsMapping'),
    remark: ctx.str('remark'),
  };
}

export const addSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+add_sync_solution',
  description: 'Create a sync solution. Required: spaceCode, syncName, srcComponent, srcDatasourceId, sinkComponent, sinkDatasourceId, sourceConfig, sinkConfig. Optional: channelConfig, fieldsMapping, remark. Use +list_sync_datasources to choose datasource IDs. Preset warehouse JSON must follow the templates; task-table sources require tableType.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncName', type: 'string', required: true, desc: 'Sync solution name' },
    { name: 'srcComponent', type: 'string', required: true, desc: 'Source component name from +list_sync_datasources, e.g. te_etl, MySQL, OSS' },
    { name: 'srcDatasourceId', type: 'string', required: true, desc: 'Source datasource ID' },
    { name: 'sinkComponent', type: 'string', required: true, desc: 'Sink component name from +list_sync_datasources, e.g. te_etl, ClickHouse, MySQL' },
    { name: 'sinkDatasourceId', type: 'string', required: true, desc: 'Sink datasource ID' },
    { name: 'sourceConfig', type: 'string', required: true, desc: 'Source configuration JSON string. Preset warehouse source requires tableType, bizClassify, dbBizType, authedSpace, partitionKeys, and successOnEmpty' },
    { name: 'sinkConfig', type: 'string', required: true, desc: 'Sink configuration JSON string. Preset warehouse sink requires tableType, bizClassify, dbBizType, authedSpace, and partitionKeys' },
    { name: 'channelConfig', type: 'string', required: false, desc: 'Channel configuration JSON string. Include gatewayConfig when source or sink uses the preset warehouse' },
    { name: 'fieldsMapping', type: 'string', required: false, desc: 'Field mapping JSON string' },
    { name: 'remark', type: 'string', required: false, desc: 'Remark' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    return callDataopsApi(ctx, toolName, buildArgs(ctx));
  },
};
