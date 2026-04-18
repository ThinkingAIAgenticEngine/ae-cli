import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const validateTaskSql: Command = {
  service: 'dataops_flow',
  command: '+validate_task_sql',
  description: 'Validate TRINO_SQL task SQL syntax and semantics (supports DQL/DML/DDL, validation only without execution). Read-only operation, no two-step confirmation required. Returns: valid (whether passed), message (validation info), errorType (SYNTAX_ERROR/SEMANTIC_ERROR/PERMISSION_ERROR, etc.), errorPosition (line/column), suggestions (fix suggestions list). Semantic validation checks table/column existence, type matching, permissions, etc. Inherits task parameter context (e.g., ${ws_run_date} resolves to actual value). Related tools: Use with flow_save_task_definition (validate before save). Difference from integration_validate_sql: integration only validates external datasource DDL',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'flowCode', type: 'number', required: true, desc: 'Task flow code' },
    { name: 'taskCode', type: 'number', required: true, desc: 'Task code' },
    { name: 'sql', type: 'string', required: true, desc: 'SQL statement to validate' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Repository code, defaults to te_etl if not provided' },
    { name: 'catalog', type: 'string', required: false, desc: 'Catalog name, defaults to hive if not provided' },
    { name: 'schema', type: 'string', required: false, desc: 'Schema/database name' },
    { name: 'engineType', type: 'string', required: false, desc: 'SQL execution engine: TASK_ENGINE_TRINO (default), TASK_ENGINE_STARROCKS' },
  ],
  risk: 'read',
  execute: async (ctx) => {
    const mcpUrl = resolveMcpUrl(ctx.mcpUrl(), ctx.host(), ctx.service());
    const result = await callMcpTool(mcpUrl, 'flow_validate_task_sql', {
      spaceCode: ctx.str('spaceCode'),
      flowCode: ctx.num('flowCode'),
      taskCode: ctx.num('taskCode'),
      sql: ctx.str('sql'),
      repoCode: ctx.str('repoCode'),
      catalog: ctx.str('catalog'),
      schema: ctx.str('schema'),
      engineType: ctx.str('engineType'),
    });
    return parseMcpResult(result);
  },
};