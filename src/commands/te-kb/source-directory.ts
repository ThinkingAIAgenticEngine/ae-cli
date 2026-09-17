import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { kbApi } from '../../core/mcp-access.js';

const sourceFlags: Flag[] = [
  { name: 'name', type: 'string', required: true, desc: 'Knowledge base name (personal then company)' },
  { name: 'id', type: 'string', required: true, desc: 'ZIP source ID copied from +list-sources' },
];
const pathFlag: Flag = { name: 'path', type: 'string', required: true, desc: 'Exact path relative to the ZIP source root' };
const revisionFlag: Flag = {
  name: 'expected-revision', type: 'number', required: true, min: 1,
  desc: 'Revision returned by +source-ls; a conflict requires a fresh read and explicit retry',
};
const apiOptions = { preserveErrorMetadata: true, retryUnauthorized: false };
const maxFileBytes = 50 * 1024 * 1024;

function validateIdentity(ctx: RuntimeContext): void {
  for (const [flag, max] of [['name', 200], ['id', 191]] as const) {
    const value = ctx.str(flag).trim();
    if (!value || value.length > max) throw new CliValidationError(`Invalid --${flag}.`);
  }
}

function relativePath(ctx: RuntimeContext, allowRoot = false): string {
  const value = ctx.str('path');
  if (allowRoot && value === '') return value;
  if (!value || value.length > 1024 || /[\\\x00-\x1f\x7f]/.test(value) || /^[A-Za-z]:/.test(value)
    || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new CliValidationError('--path must be a normalized relative path inside the ZIP source.');
  }
  return value;
}

function validateMutation(ctx: RuntimeContext): void {
  validateIdentity(ctx);
  relativePath(ctx);
  if (!Number.isSafeInteger(ctx.num('expected-revision')) || ctx.num('expected-revision') < 1) {
    throw new CliValidationError('--expected-revision must be a positive safe integer.');
  }
}

function endpoint(ctx: RuntimeContext, suffix = 'directory'): string {
  return `/agent/api/external/knowledge-bases/sources/${encodeURIComponent(ctx.str('id').trim())}/${suffix}`;
}

function query(ctx: RuntimeContext): Record<string, string> {
  return { name: ctx.str('name').trim(), path: ctx.str('path') };
}

function preview(ctx: RuntimeContext, method: string, suffix = 'directory', body?: unknown) {
  return { method, url: `${ctx.host().replace(/\/$/, '')}${endpoint(ctx, suffix)}`, ...(body ? { body } : { params: query(ctx) }) };
}

function mutationBody(ctx: RuntimeContext, operation: Record<string, unknown>) {
  return { name: ctx.str('name').trim(), expectedRevision: ctx.num('expected-revision'), operations: [operation] };
}

export const sourceLs: Command = {
  service: 'kb', command: '+source-ls', risk: 'read',
  description: 'List one ZIP source directory, its revision, and changes since successful compilation.',
  flags: [...sourceFlags, { ...pathFlag, required: false, default: '' },
    { name: 'cursor', type: 'string', desc: 'Opaque nextCursor returned by the previous page' },
    { name: 'limit', type: 'number', default: 100, min: 1, max: 200, desc: 'Page size (1-200)' }],
  validate: (ctx) => {
    validateIdentity(ctx);
    relativePath(ctx, true);
    if (!Number.isInteger(ctx.num('limit')) || ctx.num('limit') < 1 || ctx.num('limit') > 200) {
      throw new CliValidationError('--limit must be an integer from 1 to 200.');
    }
  },
  dryRun: (ctx) => ({ ...preview(ctx, 'GET'), params: { ...query(ctx), limit: ctx.num('limit'), ...(ctx.str('cursor') ? { cursor: ctx.str('cursor') } : {}) } }),
  execute: (ctx) => kbApi(ctx, 'GET', endpoint(ctx), {
    ...query(ctx), limit: ctx.num('limit'), ...(ctx.str('cursor') ? { cursor: ctx.str('cursor') } : {}),
  }, undefined, apiOptions),
};

export const sourceRead: Command = {
  service: 'kb', command: '+source-read', risk: 'read',
  description: 'Read a ZIP source file as UTF-8/base64 or save its original bytes to a new local file.',
  flags: [...sourceFlags, pathFlag,
    { name: 'encoding', type: 'string', default: 'utf8', desc: 'JSON content encoding: utf8 or base64 (ignored with --output)' },
    { name: 'output', type: 'string', desc: 'Save original bytes to this local path; existing files are never overwritten' }],
  validate: (ctx) => {
    validateIdentity(ctx);
    relativePath(ctx);
    if (!['utf8', 'base64'].includes(ctx.str('encoding'))) throw new CliValidationError('--encoding must be utf8 or base64.');
  },
  dryRun: (ctx) => preview(ctx, 'GET', 'raw'),
  execute: async (ctx) => {
    const result = await kbApi(ctx, 'GET', endpoint(ctx, 'raw'), query(ctx), undefined, { ...apiOptions, responseType: 'bytes' });
    const bytes = Buffer.from(result.bytes);
    const metadata = { path: ctx.str('path'), sizeBytes: bytes.length, contentType: result.contentType };
    if (ctx.str('output')) {
      const output = path.resolve(ctx.str('output'));
      await fs.writeFile(output, bytes, { flag: 'wx' });
      return { ...metadata, output };
    }
    if (ctx.str('encoding') === 'base64') return { ...metadata, encoding: 'base64', content: bytes.toString('base64') };
    try {
      return { ...metadata, encoding: 'utf8', content: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
    } catch {
      throw new CliValidationError('This file is not UTF-8. Use --encoding base64 or --output.');
    }
  },
};

async function fileOperation(ctx: RuntimeContext, dryRun: boolean) {
  const file = path.resolve(ctx.str('file'));
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxFileBytes) throw new CliValidationError('--file must be a regular file of at most 50 MB.');
    const action = ctx.str('action');
    const content = dryRun ? undefined : await handle.readFile();
    if (content && content.length > maxFileBytes) throw new CliValidationError('--file exceeds 50 MB.');
    return {
      action, path: ctx.str('path'), ...(action === 'replace' ? { confirmed: true } : {}),
      ...(dryRun ? { file, sizeBytes: stat.size, contentBase64: '<redacted>' } : { contentBase64: content!.toString('base64') }),
    };
  } finally {
    await handle.close();
  }
}

export const sourcePut: Command = {
  service: 'kb', command: '+source-put', risk: 'write',
  description: 'Add or explicitly replace one file at an exact ZIP-relative path using a checked revision.',
  flags: [...sourceFlags, pathFlag, revisionFlag,
    { name: 'file', type: 'string', required: true, desc: 'Local file to upload (at most 50 MB)' },
    { name: 'action', type: 'string', default: 'add', desc: 'add rejects an existing path; replace explicitly overwrites an existing file' }],
  validate: (ctx) => {
    validateMutation(ctx);
    if (!ctx.str('file').trim()) throw new CliValidationError('--file must be non-empty.');
    if (!['add', 'replace'].includes(ctx.str('action'))) throw new CliValidationError('--action must be add or replace.');
  },
  dryRun: async (ctx) => preview(ctx, 'POST', 'directory', mutationBody(ctx, await fileOperation(ctx, true))),
  execute: async (ctx) => kbApi(ctx, 'POST', endpoint(ctx), {}, mutationBody(ctx, await fileOperation(ctx, false)), apiOptions),
};

function deleteOperation(ctx: RuntimeContext) {
  return { action: 'delete', path: ctx.str('path'), confirmed: true, ...(ctx.bool('recursive') ? { recursive: true } : {}) };
}

export const sourceRm: Command = {
  service: 'kb', command: '+source-rm', risk: 'high-risk-write',
  description: 'Delete one ZIP child file or recursively delete one directory; keeps the parent source.',
  flags: [...sourceFlags, pathFlag, revisionFlag,
    { name: 'recursive', type: 'boolean', desc: 'Explicitly allow recursive directory deletion' }],
  validate: validateMutation,
  dryRun: (ctx) => preview(ctx, 'POST', 'directory', mutationBody(ctx, deleteOperation(ctx))),
  execute: (ctx) => kbApi(ctx, 'POST', endpoint(ctx), {}, mutationBody(ctx, deleteOperation(ctx)), apiOptions),
};
