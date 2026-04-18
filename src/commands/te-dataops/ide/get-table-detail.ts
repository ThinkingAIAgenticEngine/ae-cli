import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const getTableDetail: Command = {
  service: 'dataops_ide',
  command: '+ide_get_table_detail',
  description: 'Gets real-time table metadata from the data warehouse engine, including column definitions, DDL, partition information. Returns: columns(name/type/comment), ddl, partitions, rowCount, dataSize. Difference from datatable_get_table_detail: This tool directly queries real-time metadata from the data warehouse engine, datatable queries dataops platform registered information(including data lineage). Difference from integration_get_table_structure: integration queries external data source metadata',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'connType', type: 'string', required: true, desc: 'Connection type: SPACE(data warehouse for daily queries, default), ETL(ETL engine for data processing), APP(app warehouse for external services)' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name' },
    { name: 'tableName', type: 'string', required: true, desc: 'Table name' },
    { name: 'engineType', type: 'string', required: true, desc: 'SQL execution engine: TASK_ENGINE_TRINO(default), TASK_ENGINE_STARROCKS' },
    { name: 'isView', type: 'boolean', required: true, desc: 'Whether it is a view, auto-detect if not provided' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_get_table_detail', {
      spaceCode: ctx.str('spaceCode'),
      connType: ctx.str('connType'),
      repoCode: ctx.str('repoCode'),
      catalog: ctx.str('catalog'),
      schema: ctx.str('schema'),
      tableName: ctx.str('tableName'),
      engineType: ctx.str('engineType'),
      isView: ctx.bool('isView'),
    });
    return parseMcpResult(result);
  },
};