import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const addSyncSolution: Command = {
  service: 'dataops_integration',
  command: '+add_sync_solution',
  description: 'Create a sync solution. Write operation requires two-step confirmation: first call returns operation preview, confirm by setting confirmed=true to execute creation. Before creation, suggest viewing available source/sink datasources via integration_list_sync_datasources. Need to specify source and sink component names, datasource IDs and configurations. Returns syncId after successful creation, which can be used for subsequent operations (view details, execute sync, etc.)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'syncName', type: 'string', required: true, desc: 'Sync solution name' },
    { name: 'srcComponent', type: 'string', required: true, desc: 'Source component name (e.g., MySQL, OSS, Hive)' },
    { name: 'srcDatasourceId', type: 'string', required: true, desc: 'Source datasource ID' },
    { name: 'sinkComponent', type: 'string', required: true, desc: 'Sink component name (e.g., ClickHouse, StarRocks, MySQL)' },
    { name: 'sinkDatasourceId', type: 'string', required: true, desc: 'Sink datasource ID' },
    { name: 'sourceConfig', type: 'string', required: true, desc: 'Source configuration JSON string' },
    { name: 'sinkConfig', type: 'string', required: true, desc: 'Sink configuration JSON string' },
    { name: 'channelConfig', type: 'string', required: false, desc: 'Channel configuration JSON string' },
    { name: 'fieldsMapping', type: 'string', required: false, desc: 'Field mapping JSON string' },
    { name: 'remark', type: 'string', required: false, desc: 'Remark' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute, defaults to false if not provided' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_add_sync_solution', {
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
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};