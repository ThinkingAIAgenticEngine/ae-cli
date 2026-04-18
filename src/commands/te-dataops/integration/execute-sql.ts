import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const executeSql: Command = {
  service: 'dataops_integration',
  command: '+integration_execute_sql',
  description: 'Execute DDL SQL on datasource (only supports CREATE/DROP/ALTER). Write operation requires two-step confirmation: First call returns operation preview (including SQL content), after confirmation set confirmed=true to execute. DDL operations will directly modify database structure, please confirm SQL correctness. Recommend calling integration_validate_sql to validate SQL syntax before calling this tool to execute. Supports createDualEnv=true to execute in both DEV and PROD environments simultaneously. Note: Default environment is PROD, DDL operations cannot be rolled back',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: PROD(production, default), DEV(development)' },
    { name: 'createDualEnv', type: 'boolean', required: false, desc: 'Whether to sync execute in both environments: true/false, default false' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID (obtainable via integration_list_space_datasources)' },
    { name: 'database', type: 'string', required: true, desc: 'Database name (obtainable via integration_list_datasource_databases)' },
    { name: 'sql', type: 'string', required: true, desc: 'DDL SQL to execute (only supports CREATE/DROP/ALTER)' },
    { name: 'confirmed', type: 'boolean', required: false, desc: 'Confirmed to execute. First call omit or pass false for preview, then pass true to execute' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_execute_sql', {
      spaceCode: ctx.str('spaceCode'),
      env: ctx.str('env'),
      createDualEnv: ctx.bool('createDualEnv'),
      datasourceId: ctx.str('datasourceId'),
      database: ctx.str('database'),
      sql: ctx.str('sql'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};