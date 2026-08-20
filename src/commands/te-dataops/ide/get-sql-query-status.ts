import type { Command, RuntimeContext } from '../../../framework/types.js';
import { buildDataopsApiDryRun, callDataopsApi, downloadDataopsApi } from '../shared.js';

const toolName = 'ide_get_sql_query_status';
const downloadPath = '/api/cli/dataops/v1/gaia/ide/sql-query-download';

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

function isDownloadReady(data: any): boolean {
  return data?.downloadStatus === 'SUCCESS' || data?.downloadStatus === 'async_ok';
}

async function downloadResult(ctx: RuntimeContext, data: any, targetPath: string): Promise<string> {
  const params = data?.downloadParams ?? {};
  return downloadDataopsApi(ctx, downloadPath, {
    spaceCode: params.spaceCode,
    taskId: params.taskId,
  }, targetPath);
}

export const getSqlQueryStatus: Command = {
  service: 'dataops_ide',
  command: '+get_sql_query_status',
  description: 'Poll a Gaia download-center task created by +submit_sql_query. Requires spaceCode and downloadTaskId. requestId is trace-only. Returns status and download metadata; --downloadTo streams the result zip to a local file after SUCCESS and adds localFile.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code returned by +submit_sql_query' },
    { name: 'downloadTaskId', type: 'number', required: true, desc: 'Download task ID returned by +submit_sql_query' },
    { name: 'requestId', type: 'string', required: false, desc: 'Optional request ID returned by +submit_sql_query, used only for trace display' },
    { name: 'downloadTo', type: 'string', required: false, desc: 'Optional local file path. After SUCCESS, stream the result zip and replace this path only when the download completes; use a .zip suffix, for example ./result.zip.' },
  ],
  risk: 'read',
  dryRun: (ctx) => buildDataopsApiDryRun(ctx, toolName, buildArgs(ctx)),
  execute: async (ctx) => {
    const data = await callDataopsApi(ctx, toolName, buildArgs(ctx));
    const downloadTo = optionalString(ctx, 'downloadTo');
    if (downloadTo && isDownloadReady(data)) {
      return { ...(data as Record<string, unknown>), localFile: await downloadResult(ctx, data, downloadTo) };
    }
    return data;
  },
};
