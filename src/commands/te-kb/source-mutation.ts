import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { kbApi, kbUpload } from '../../core/mcp-access.js';

const API = '/agent/api/external/knowledge-bases';
const apiOptions = { preserveErrorMetadata: true };
const maxBytes = 50 * 1024 * 1024;
const fileExtensions = new Set(['.md', '.markdown', '.txt', '.csv', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']);
const identityFlags: Flag[] = [
  { name: 'name', type: 'string', required: true, desc: 'Exact knowledge base name from kb +list' },
  { name: 'scope', type: 'string', required: true, desc: 'Exact knowledge base scope: personal or company' },
  { name: 'id', type: 'string', required: true, desc: 'Current stable source ID from kb +list-sources' },
];
const typeFlag: Flag = { name: 'source-type', type: 'string', required: true, desc: 'Current source type from kb +list-sources: file or zip' };
const revisionFlag: Flag = { name: 'expected-revision', type: 'number', required: true, min: 1, max: 2147483647, desc: 'Current contentRevision from kb +list-sources; never automatically retry a conflict' };
const previewFlag: Flag = { name: 'preview-id', type: 'string', required: true, desc: 'Exact previewId returned by ZIP replace or restore' };

function validateIdentity(ctx: RuntimeContext): void {
  for (const [flag, max] of [['name', 200], ['id', 191], ['preview-id', 191]] as const) {
    const value = ctx.str(flag);
    if ((flag !== 'preview-id' || value) && (!value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value))) {
      throw new CliValidationError(`--${flag} must contain 1 to ${max} characters without control characters.`);
    }
  }
  if (!['personal', 'company'].includes(ctx.str('scope'))) throw new CliValidationError('--scope must be personal or company.');
}
function positiveInteger(ctx: RuntimeContext, flag: string): void {
  const value = ctx.num(flag);
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new CliValidationError(`--${flag} must be an integer from 1 to 2147483647.`);
}
function validateMutation(ctx: RuntimeContext): void {
  validateIdentity(ctx);
  positiveInteger(ctx, 'expected-revision');
  if (!['file', 'zip'].includes(ctx.str('source-type'))) throw new CliValidationError('--source-type must be file or zip; URL sources cannot be replaced or restored.');
}
function query(ctx: RuntimeContext): Record<string, string> {
  return { name: ctx.str('name').trim(), scope: ctx.str('scope') };
}
function sourceEndpoint(ctx: RuntimeContext, suffix: string): string {
  return `${API}/sources/${encodeURIComponent(ctx.str('id').trim())}/${suffix}`;
}
function previewEndpoint(ctx: RuntimeContext): string {
  return sourceEndpoint(ctx, `directory/previews/${encodeURIComponent(ctx.str('preview-id').trim())}`);
}
function dryRequest(ctx: RuntimeContext, method: string, endpoint: string, body?: unknown) {
  return { method, url: `${ctx.host().replace(/\/$/, '')}${endpoint}`, params: query(ctx), ...(body === undefined ? {} : { body }) };
}
async function replacementFile(ctx: RuntimeContext, read: boolean) {
  const file = path.resolve(ctx.str('file'));
  const extension = path.extname(file).toLowerCase();
  if (ctx.str('source-type') === 'zip' ? extension !== '.zip' : !fileExtensions.has(extension)) {
    throw new CliValidationError('--file must be a ZIP for a ZIP source, or a supported non-ZIP file for a file source. File sources must keep their original format.');
  }
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw new CliValidationError('--file must be a regular file of at most 50 MB.');
    const content = read ? await handle.readFile() : undefined;
    if (content && content.length > maxBytes) throw new CliValidationError('--file exceeds 50 MB.');
    return { file, filename: path.basename(file), sizeBytes: content?.length ?? stat.size, content };
  } finally {
    await handle.close();
  }
}
function replaceEndpoint(ctx: RuntimeContext): string {
  return sourceEndpoint(ctx, ctx.str('source-type') === 'zip' ? 'directory/previews' : 'raw');
}
function replaceFields(ctx: RuntimeContext) {
  return { expectedRevision: ctx.num('expected-revision'), ...(ctx.str('source-type') === 'zip' ? { mode: 'archive' } : {}) };
}
export const sourceReplace: Command = {
  service: 'kb', resource: 'source', command: 'replace', risk: 'write',
  description: 'Replace a file source draft, or prepare a ZIP archive replacement preview. ZIP changes require source commit. Does not compile or publish.',
  flags: [...identityFlags, typeFlag, revisionFlag, { name: 'file', type: 'string', required: true, desc: 'Local replacement file, at most 50 MB; same format, different filename allowed' }],
  validate: (ctx) => { validateMutation(ctx); if (!ctx.str('file').trim()) throw new CliValidationError('--file is required.'); },
  dryRun: async (ctx) => {
    const { file, filename, sizeBytes } = await replacementFile(ctx, false);
    return { ...dryRequest(ctx, ctx.str('source-type') === 'zip' ? 'POST' : 'PUT', replaceEndpoint(ctx), replaceFields(ctx)), multipart: { file, filename, sizeBytes, content: '<redacted>' } };
  },
  execute: async (ctx) => {
    const file = await replacementFile(ctx, true);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file.content!)]), file.filename);
    for (const [key, value] of Object.entries(replaceFields(ctx))) form.append(key, String(value));
    return kbUpload(ctx, replaceEndpoint(ctx), form, query(ctx), { ...apiOptions, method: ctx.str('source-type') === 'zip' ? 'POST' : 'PUT' });
  },
};
function restoreEndpoint(ctx: RuntimeContext): string {
  return `${API}/versions/${ctx.num('version')}/sources/${encodeURIComponent(ctx.str('id').trim())}/restore`;
}
function restoreBody(ctx: RuntimeContext) {
  return { expectedRevision: ctx.num('expected-revision'), ...(ctx.str('source-type') === 'zip' ? (ctx.str('path') ? { target: 'file', path: ctx.str('path') } : { target: 'source' }) : {}) };
}
export const sourceRestore: Command = {
  service: 'kb', resource: 'source', command: 'restore', risk: 'write',
  description: 'Restore one current source draft from a published version. File sources restore immediately; ZIP source or child restores return a preview. Does not roll back the whole knowledge base or publish.',
  flags: [...identityFlags, typeFlag, revisionFlag,
    { name: 'version', type: 'number', required: true, min: 1, max: 2147483647, desc: 'Published version number from kb +versions; use the latest number to discard unpublished changes' },
    { name: 'path', type: 'string', desc: 'Optional exact historical ZIP child file path from kb +version-tree; omit to restore the entire ZIP source' }],
  validate: (ctx) => {
    validateMutation(ctx); positiveInteger(ctx, 'version');
    const value = ctx.str('path');
    if (value && (ctx.str('source-type') !== 'zip' || value.length > 1024 || /[\\\x00-\x1f\x7f]/.test(value) || /^[A-Za-z]:/.test(value) || value.split('/').some(p => !p || p === '.' || p === '..'))) {
      throw new CliValidationError('--path is only valid for a ZIP child and must be a normalized relative file path.');
    }
  },
  dryRun: (ctx) => dryRequest(ctx, 'POST', restoreEndpoint(ctx), restoreBody(ctx)),
  execute: (ctx) => kbApi(ctx, 'POST', restoreEndpoint(ctx), query(ctx), restoreBody(ctx), apiOptions),
};
export const sourcePreview: Command = {
  service: 'kb', resource: 'source', command: 'preview', risk: 'read',
  description: 'Read one page of a ZIP replacement or restore preview, including additions, modifications and deletions.',
  flags: [...identityFlags, previewFlag,
    { name: 'cursor', type: 'string', desc: 'Opaque nextCursor returned by the previous preview page' },
    { name: 'limit', type: 'number', default: 100, min: 1, max: 200, desc: 'Preview page size from 1 to 200' }],
  validate: (ctx) => {
    validateIdentity(ctx);
    if (!Number.isInteger(ctx.num('limit')) || ctx.num('limit') < 1 || ctx.num('limit') > 200) throw new CliValidationError('--limit must be an integer from 1 to 200.');
    if (ctx.str('cursor').length > 4096) throw new CliValidationError('--cursor must be at most 4096 characters.');
  },
  dryRun: (ctx) => ({ ...dryRequest(ctx, 'GET', previewEndpoint(ctx)), params: { ...query(ctx), limit: ctx.num('limit'), ...(ctx.str('cursor') ? { cursor: ctx.str('cursor') } : {}) } }),
  execute: (ctx) => kbApi(ctx, 'GET', previewEndpoint(ctx), { ...query(ctx), limit: ctx.num('limit'), ...(ctx.str('cursor') ? { cursor: ctx.str('cursor') } : {}) }, undefined, apiOptions),
};
export const sourceCommit: Command = {
  service: 'kb', resource: 'source', command: 'commit', risk: 'high-risk-write',
  description: 'Confirm a reviewed ZIP replacement or restore preview. May delete missing files; changes only the draft. On uncertain outcome, inspect state before any retry.',
  flags: [...identityFlags, previewFlag, revisionFlag],
  validate: (ctx) => { validateIdentity(ctx); positiveInteger(ctx, 'expected-revision'); },
  dryRun: (ctx) => dryRequest(ctx, 'POST', `${previewEndpoint(ctx)}/commit`, { expectedRevision: ctx.num('expected-revision'), confirmed: true }),
  execute: (ctx) => kbApi(ctx, 'POST', `${previewEndpoint(ctx)}/commit`, query(ctx), { expectedRevision: ctx.num('expected-revision'), confirmed: true }, apiOptions),
};
export const sourceCancel: Command = {
  service: 'kb', resource: 'source', command: 'cancel', risk: 'high-risk-write',
  description: 'Discard an uncommitted ZIP replacement or restore preview; leaves the source draft unchanged.',
  flags: [...identityFlags, previewFlag],
  validate: validateIdentity,
  dryRun: (ctx) => dryRequest(ctx, 'DELETE', previewEndpoint(ctx)),
  execute: async (ctx) => {
    await kbApi(ctx, 'DELETE', previewEndpoint(ctx), query(ctx), undefined, { ...apiOptions, responseType: 'empty' });
    return { previewId: ctx.str('preview-id'), cancelled: true };
  },
};
