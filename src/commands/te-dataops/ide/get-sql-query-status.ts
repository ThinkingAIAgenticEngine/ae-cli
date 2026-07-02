import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Command, RuntimeContext } from '../../../framework/types.js';
import { resolveHost } from '../../../core/auth.js';
import { buildDataopsApiDryRun, callDataopsApi } from '../shared.js';

const toolName = 'ide_get_sql_query_status';

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
  const token = await ctx.token();
  const host = resolveHost(ctx.host()).replace(/\/+$/, '');
  const params = data?.downloadParams ?? {};
  const url = new URL(`${host}/v1/gaia/task/async/download`);
  url.searchParams.set('accessToken', token);
  url.searchParams.set('spaceCode', String(params.spaceCode));
  url.searchParams.set('taskId', String(params.taskId));

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Download failed: HTTP ${resp.status} ${resp.statusText}`);
  }

  const absPath = path.resolve(targetPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, Buffer.from(await resp.arrayBuffer()));
  return absPath;
}

export const getSqlQueryStatus: Command = {
  service: 'dataops_ide',
  command: '+get_sql_query_status',
  description: 'Poll a Gaia download-center task created by +submit_sql_query. Requires spaceCode and downloadTaskId. requestId is trace-only. Returns status and download metadata; --downloadTo saves the result zip locally after SUCCESS and adds localFile.',
  flags: [
    { name: 'spaceCode', type: 'string', required: true, desc: 'Space code returned by +submit_sql_query' },
    { name: 'downloadTaskId', type: 'number', required: true, desc: 'Download task ID returned by +submit_sql_query' },
    { name: 'requestId', type: 'string', required: false, desc: 'Optional request ID returned by +submit_sql_query, used only for trace display' },
    { name: 'downloadTo', type: 'string', required: false, desc: 'Optional local file path. When downloadStatus=SUCCESS, save the result zip to this path; use a .zip suffix, for example ./result.zip.' },
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
