import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const validateSql: Command = {
  service: 'dataops_integration',
  command: '+validate_sql',
  description: 'Validate SQL syntax and semantics, only supports DDL (CREATE/DROP/ALTER), does not execute SQL. Return fields: valid (whether passed), message (validation result description). Difference from ide_execute_sql: This tool only validates without execution, and only supports DDL statements. Recommend calling this tool to validate before calling integration_execute_sql, to avoid executing incorrect SQL that damages database structure. Note: Default environment is PROD',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'env', type: 'string', required: false, desc: 'Environment: PROD (production, default), DEV (development)' },
    { name: 'datasourceId', type: 'string', required: true, desc: 'Datasource ID (can be obtained through integration_list_space_datasources)' },
    { name: 'database', type: 'string', required: true, desc: 'Database name (can be obtained through integration_list_datasource_databases)' },
    { name: 'sql', type: 'string', required: true, desc: 'SQL statement to validate, only supports DDL (CREATE/DROP/ALTER)' },
    { name: 'expectedOperation', type: 'string', required: false, desc: 'Expected SQL operation type: CREATE_TABLE, DROP_TABLE, ALTER_TABLE' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'integration_validate_sql', {
      spaceCode: ctx.str('spaceCode'),
      env: ctx.str('env'),
      datasourceId: ctx.str('datasourceId'),
      database: ctx.str('database'),
      sql: ctx.str('sql'),
      expectedOperation: ctx.str('expectedOperation'),
    });
    return parseMcpResult(result);
  },
};