import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_submit_sql_query';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    repoCode: optionalString(ctx, 'repoCode'),
    sql: ctx.str('sql'),
    engineType: optionalString(ctx, 'engineType'),
  };
}

export const submitSqlQuery: Command = {
  service: 'dataops_ide',
  command: '+submit_sql_query',
  description: 'Submit an IDE SQL query and create a Gaia download-center task. Requires spaceCode and sql. Optional repoCode/engineType default to te_etl/TASK_ENGINE_TRINO. Returns download task metadata; result rows are never returned by MCP/CLI.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code' },
    { name: 'sql', type: 'string', required: true, desc: 'SQL statement to execute' },
    { name: 'repoCode', type: 'string', required: false, desc: 'Repository code. Defaults to te_etl.' },
    { name: 'engineType', type: 'string', required: false, desc: 'SQL execution engine. Defaults to TASK_ENGINE_TRINO. Optional: TASK_ENGINE_STARROCKS.' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
