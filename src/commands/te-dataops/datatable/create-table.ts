import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const createTable: Command = {
  service: 'dataops_datatable',
  command: '+create_table',
  description: 'Create physical tables (DWD/DWS/ADS layer) in space data warehouse. Write operation requires two-step confirmation: First call returns operation preview, set confirmed=true to execute after confirmation. Requires complete CREATE TABLE DDL. Table name rule: ^[a-z][0-9a-z_]{0,127}$. Error will be raised if table already exists. Returns: tableName, repoCode, catalog, schema, message',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'ddl', type: 'string', required: true, desc: 'Complete CREATE TABLE DDL statement' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'catalog', type: 'string', required: false, desc: 'Catalog name, defaults to hive if not provided' },
    { name: 'schema', type: 'string', required: false, desc: 'Schema/database name, uses space default task database if not provided' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Whether confirmed to execute. First call without this parameter or with false for preview, pass true to execute after confirmation' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'datatable_create_table', {
      spaceCode: ctx.str('spaceCode'),
      ddl: ctx.str('ddl'),
      repoCode: ctx.str('repoCode'),
      catalog: ctx.str('catalog'),
      schema: ctx.str('schema'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};