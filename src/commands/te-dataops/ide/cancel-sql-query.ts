import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_cancel_sql_query';

function optionalString(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name);
  return value === '' ? undefined : value;
}

function buildArgs(ctx: RuntimeContext): Record<string, unknown> {
  return {
    spaceCode: ctx.str('spaceCode'),
    downloadTaskId: ctx.num('downloadTaskId'),
    requestId: optionalString(ctx, 'requestId'),
  };
}

export const cancelSqlQuery: Command = {
  service: 'dataops_ide',
  command: '+cancel_sql_query',
  description: 'Cancel a Gaia download-center task created by +submit_sql_query. Requires spaceCode and downloadTaskId; requestId is optional trace-only. Returns cancellation status metadata.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code returned by +submit_sql_query' },
    { name: 'downloadTaskId', type: 'number', required: true, desc: 'Download task ID returned by +submit_sql_query or +get_sql_query_status' },
    { name: 'requestId', type: 'string', required: false, desc: 'Optional request ID returned by +submit_sql_query, used only for trace display' },
  ],
  risk: 'write',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => callDataopsApi(ctx, toolName, buildArgs(ctx)),
};
