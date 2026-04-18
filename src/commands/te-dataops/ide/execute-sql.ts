import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const executeSql: Command = {
  service: 'dataops_ide',
  command: '+ide_execute_sql',
  description: 'Asynchronously executes SQL queries. Write operations require two-step confirmation. Returns: requestId. Async execution flow: 1) Call this tool to get requestId, 2) Poll ide_get_query_progress (recommend 2-5 second interval), 3) Call ide_get_query_result to get results when state=FINISHED. Only supports DQL/DML. For DDL, use integration_execute_sql. Difference from integration_execute_sql: This tool executes asynchronously in the data warehouse engine and supports SELECT/DML; integration executes DDL in external data sources',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'repoCode', type: 'string', required: true, desc: 'Repository code' },
    { name: 'sql', type: 'string', required: true, desc: 'SQL statement' },
    { name: 'engineType', type: 'string', required: true, desc: 'SQL execution engine: TASK_ENGINE_TRINO(default, suitable for interactive queries), TASK_ENGINE_STARROCKS(suitable for real-time analytics and high-concurrency queries)' },
    { name: 'confirmed', type: 'boolean', required: true, desc: 'Whether confirmed to execute. First call: omit or pass false for preview, then pass true to execute' },
  ],
  risk: 'write',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'ide_execute_sql', {
      spaceCode: ctx.str('spaceCode'),
      repoCode: ctx.str('repoCode'),
      sql: ctx.str('sql'),
      engineType: ctx.str('engineType'),
      confirmed: ctx.bool('confirmed'),
    });
    return parseMcpResult(result);
  },
};