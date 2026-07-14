/**
 * ae-cli agent attachment library management commands
 *
 * +list-attachments  — list attachments (paginated)
 * +add-attachment    — upload sandbox file(s) to the attachment library
 * +del-attachment    — delete an attachment
 * +attachment-stats  — show attachment library statistics (total files, size, images, documents)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';

import type { Command, RuntimeContext } from '../../framework/types.js';
import {
  getFromMainApp,
  deleteFromMainApp,
  uploadToMainApp,
} from '../../core/te-agent-client.js';

const LIST_PATH = '/api/sandbox/agent/attachments';
const UPLOAD_PATH = '/api/sandbox/agent/attachments/upload';
const STATS_PATH = '/api/sandbox/agent/attachments/stats';

/** Infer MIME type from file extension */
function guessMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.html': 'text/html',
    '.xml': 'application/xml',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Resolve the --file or --files argument into an array of file paths
 */
function resolveFilePaths(ctx: RuntimeContext): string[] {
  const file = ctx.str('file');
  const files = ctx.str('files');

  if (file && files) {
    throw new Error('--file and --files cannot be used together');
  }
  if (!file && !files) {
    throw new Error('Either --file or --files must be specified');
  }
  if (file) return [file];

  try {
    const parsed = JSON.parse(files);
    if (!Array.isArray(parsed)) throw new Error('--files must be a JSON array');
    return parsed.map((p: unknown) => {
      if (typeof p !== 'string') throw new Error('--files array elements must be strings');
      return p;
    });
  } catch (err) {
    if (err instanceof SyntaxError) throw new Error('--files must be a valid JSON array');
    throw err;
  }
}

/**
 * Build FormData and upload multiple files
 */
async function uploadFiles(filePaths: string[]): Promise<any> {
  const formData = new FormData();
  for (const filePath of filePaths) {
    const resolved = resolve(filePath);
    if (!existsSync(resolved)) {
      throw new Error(`File not found: ${resolved}`);
    }
    const buffer = readFileSync(resolved);
    const mimeType = guessMimeType(resolved);
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, basename(resolved));
  }
  return uploadToMainApp(UPLOAD_PATH, formData);
}

export const listAttachments: Command = {
  service: 'agent',
  command: '+list-attachments',
  description: 'List user attachments (paginated)',
  flags: [
    { name: 'q', type: 'string', required: false, desc: 'Search keyword' },
    { name: 'type', type: 'string', required: false, desc: 'Filter by type: image | document' },
    { name: 'page', type: 'number', required: false, desc: 'Page number (default 1)' },
    { name: 'page-size', type: 'number', required: false, desc: 'Page size (default 20, max 10000)' },
  ],
  risk: 'read',
  validate: (ctx) => {
    const type = ctx.str('type');
    if (type && !['image', 'document'].includes(type)) {
      throw new Error('--type must be image or document');
    }
  },
  dryRun: (ctx) => {
    const params = new URLSearchParams();
    if (ctx.str('q')) params.set('q', ctx.str('q'));
    if (ctx.str('type')) params.set('type', ctx.str('type'));
    if (ctx.num('page')) params.set('page', String(ctx.num('page')));
    if (ctx.num('pageSize')) params.set('pageSize', String(ctx.num('pageSize')));
    const qs = params.toString();
    return { method: 'GET', url: `${LIST_PATH}${qs ? '?' + qs : ''}` };
  },
  execute: async (ctx) => {
    const params = new URLSearchParams();
    if (ctx.str('q')) params.set('q', ctx.str('q'));
    if (ctx.str('type')) params.set('type', ctx.str('type'));
    if (ctx.num('page')) params.set('page', String(ctx.num('page')));
    if (ctx.num('pageSize')) params.set('pageSize', String(ctx.num('pageSize')));
    const qs = params.toString();
    return getFromMainApp(`${LIST_PATH}${qs ? '?' + qs : ''}`);
  },
};

export const addAttachment: Command = {
  service: 'agent',
  command: '+add-attachment',
  description: 'Upload sandbox file(s) to attachment library',
  flags: [
    { name: 'file', type: 'string', required: false, desc: 'Single file path' },
    { name: 'files', type: 'string', required: false, desc: 'JSON array of file paths, e.g. \'["./a.png","./b.pdf"]\'' },
  ],
  risk: 'write',
  validate: (ctx) => {
    resolveFilePaths(ctx);
  },
  dryRun: (ctx) => {
    const paths = resolveFilePaths(ctx);
    return { method: 'POST', url: UPLOAD_PATH, body: { files: paths } };
  },
  execute: async (ctx) => {
    const paths = resolveFilePaths(ctx);
    return uploadFiles(paths);
  },
};

export const delAttachment: Command = {
  service: 'agent',
  command: '+del-attachment',
  description: 'Soft-delete an attachment',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'Attachment ID' },
  ],
  risk: 'high-risk-write',
  dryRun: (ctx) => ({
    method: 'DELETE',
    url: `${LIST_PATH}?id=${encodeURIComponent(ctx.str('id'))}`,
  }),
  execute: async (ctx) => {
    return deleteFromMainApp(`${LIST_PATH}?id=${encodeURIComponent(ctx.str('id'))}`);
  },
};

export const attachmentStats: Command = {
  service: 'agent',
  command: '+attachment-stats',
  description: 'Show attachment library statistics (total files, size, images, documents)',
  flags: [],
  risk: 'read',
  dryRun: () => ({
    method: 'GET',
    url: STATS_PATH,
  }),
  execute: async () => {
    return getFromMainApp(STATS_PATH);
  },
};
