import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const generateSql: Command = {
  service: 'dataops_ide',
  command: '+generate_sql',
  description: 'Generates SELECT SQL statement based on table name and column names. Returns: Executable SELECT SQL string. Related tools: ide_execute_sql (execute the generated SQL)',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'catalog', type: 'string', required: true, desc: 'Catalog name' },
    { name: 'schema', type: 'string', required: true, desc: 'Schema name' },
    { name: 'tableName', type: 'string', required: true, desc: 'Table name' },
    { name: 'engineType', type: 'string', required: true, desc: 'SQL execution engine: TASK_ENGINE_TRINO(default), TASK_ENGINE_STARROCKS' },
    { name: 'selectColumns', type: 'string', required: true, desc: 'List of column names to query, queries all columns if not provided' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_generate_sql', {
      spaceCode: ctx.str('spaceCode'),
      repoCode: ctx.str('repoCode'),
      catalog: ctx.str('catalog'),
      schema: ctx.str('schema'),
      tableName: ctx.str('tableName'),
      engineType: ctx.str('engineType'),
      selectColumns: ctx.str('selectColumns'),
    });
    return parseMcpResult(result);
  },
};