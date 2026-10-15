import { CliValidationError } from '../../../core/errors.js';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import type { Command } from '../../../framework/types.js';
import { uploadWorkspaceApi } from '../client.js';
import { optional, targetDryRun, WORKSPACE_SERVICE } from '../shared.js';
import { resolveWorkspaceTarget, workspaceResourcePath, workspaceTargetFlags } from '../target.js';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function guessMimeType(filePath: string): string {
  const map: Record<string, string> = {
    '.csv': 'text/csv',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.txt': 'text/plain',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.zip': 'application/zip',
  };
  return map[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

export const uploadWorkspaceAsset: Command = {
  service: WORKSPACE_SERVICE,
  resource: 'asset',
  command: 'upload',
  description: 'Upload one local file into an AgentSpace folder',
  flags: [
    ...workspaceTargetFlags,
    { name: 'file', type: 'string', required: true, desc: 'Local file path' },
    { name: 'path', type: 'string', required: false, desc: 'Destination folder path; defaults to the root' },
  ],
  risk: 'write',
  validate: (ctx) => {
    const file = resolve(ctx.str('file'));
    if (!existsSync(file) || !statSync(file).isFile()) throw new CliValidationError('The --file path must point to an existing regular file.');
    if (statSync(file).size > MAX_UPLOAD_BYTES) throw new CliValidationError('File exceeds the 50 MB upload limit');
  },
  dryRun: (ctx) => targetDryRun(ctx, 'POST', '/documents/upload', {
    file: resolve(ctx.str('file')),
    path: optional(ctx, 'path') ?? '',
  }),
  execute: async (ctx) => {
    const target = await resolveWorkspaceTarget(ctx);
    const file = resolve(ctx.str('file'));
    const bytes = readFileSync(file);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)], { type: guessMimeType(file) }), basename(file));
    form.append('path', optional(ctx, 'path') ?? '');
    return uploadWorkspaceApi(ctx, workspaceResourcePath(target.agentSpaceId, '/documents/upload'), form);
  },
};
