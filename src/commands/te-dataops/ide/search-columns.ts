import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const searchColumns: Command = {
  service: 'dataops_ide',
  command: '+search_columns',
  description: 'Fuzzy search column names across tables. Returns: columnName, columnType, tableName, catalogName, schemaName. Useful for finding which tables contain a specific field',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'searchKey', type: 'string', required: true, desc: 'Column name search keyword' },
    { name: 'tables', type: 'string', required: true, desc: 'List of tables to search (JSON array format, each item contains catalog, schema, tableName fields)' },
    { name: 'engineType', type: 'string', required: true, desc: 'SQL execution engine: TASK_ENGINE_TRINO(default), TASK_ENGINE_STARROCKS' },
    { name: 'pageNum', type: 'number', required: true, desc: 'Page number, default 1' },
    { name: 'pageSize', type: 'number', required: true, desc: 'Page size, default 100' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_search_columns', {
      spaceCode: ctx.str('spaceCode'),
      repoCode: ctx.str('repoCode'),
      searchKey: ctx.str('searchKey'),
      tables: ctx.str('tables'),
      engineType: ctx.str('engineType'),
      pageNum: ctx.num('pageNum'),
      pageSize: ctx.num('pageSize'),
    });
    return parseMcpResult(result);
  },
};