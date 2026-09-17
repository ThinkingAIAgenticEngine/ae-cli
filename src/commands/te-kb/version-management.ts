import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API = '/agent/api/external/knowledge-bases/versions';
const apiOptions = { preserveErrorMetadata: true, retryUnauthorized: false };
const targetFlags: Flag[] = [
  { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 200, desc: 'Exact knowledge base name copied from +list' },
  { name: 'scope', type: 'string', desc: 'Exact personal or company scope; omit for personal then company lookup' },
];
const versionFlag: Flag = { name: 'version', type: 'number', required: true, min: 1, max: 2147483647, desc: 'Historical version number from +versions, without the v prefix' };
const sourceFlag: Flag = { name: 'id', type: 'string', required: true, minLength: 1, maxLength: 191, desc: 'Stable historical source ID copied from +version-sources' };
const pagingFlags: Flag[] = [
  { name: 'cursor', type: 'string', desc: 'nextCursor from the previous page; omit for the first page' },
  { name: 'limit', type: 'number', default: 100, min: 1, max: 200, desc: 'Page size from 1 to 200' },
];
const pathFlag: Flag = { name: 'path', type: 'string', desc: 'Exact path relative to the historical source directory' };

function positiveInteger(ctx: RuntimeContext, flag: string): number {
  const value = ctx.num(flag);
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new CliValidationError(`--${flag} must be a positive integer no greater than 2147483647.`);
  return value;
}
function validateTarget(ctx: RuntimeContext): void {
  const name = ctx.str('name').trim();
  if (!name || name.length > 200) throw new CliValidationError('--name must contain 1 to 200 characters.');
  getExternalKnowledgeBaseTargetScope(ctx);
}
function validateVersion(ctx: RuntimeContext): void { validateTarget(ctx); positiveInteger(ctx, 'version'); }
function validateSource(ctx: RuntimeContext): void {
  validateVersion(ctx);
  const id = ctx.str('id').trim();
  if (!id || id.length > 191) throw new CliValidationError('--id must contain 1 to 191 characters.');
}
function validatePage(ctx: RuntimeContext): void {
  const limit = ctx.num('limit');
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new CliValidationError('--limit must be an integer from 1 to 200.');
  if (ctx.str('cursor').length > 500) throw new CliValidationError('--cursor must be at most 500 characters.');
}
function validatePath(ctx: RuntimeContext, required = false): void {
  const value = ctx.str('path');
  if (!value && !required) return;
  if (!value || value.length > 500 || /[\\\x00-\x1f\x7f]/.test(value) || /^[A-Za-z]:/.test(value) || value.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new CliValidationError('--path must be a normalized relative path inside the historical source.');
  }
}
function query(ctx: RuntimeContext): Record<string, string | number> {
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  return { name: ctx.str('name').trim(), ...(scope ? { scope } : {}) };
}
function pageQuery(ctx: RuntimeContext) {
  return { ...query(ctx), limit: ctx.num('limit'), ...(ctx.str('cursor') ? { cursor: ctx.str('cursor') } : {}) };
}
function versionEndpoint(ctx: RuntimeContext, suffix = ''): string { return `${API}/${positiveInteger(ctx, 'version')}${suffix}`; }
function sourceEndpoint(ctx: RuntimeContext, action: string): string { return versionEndpoint(ctx, `/sources/${encodeURIComponent(ctx.str('id').trim())}/${action}`); }
function preview(ctx: RuntimeContext, endpoint: string, params: Record<string, string | number>, body?: unknown) {
  return { method: body ? 'POST' : 'GET', url: `${ctx.host().replace(/\/$/, '')}${endpoint}`, params, ...(body ? { body } : {}) };
}

export const versions: Command = {
  service: 'kb', command: '+versions', risk: 'read', description: 'List immutable published versions and the latest version ID, one page at a time.',
  flags: [...targetFlags, ...pagingFlags],
  validate: (ctx) => { validateTarget(ctx); validatePage(ctx); if (ctx.str('cursor') && (!/^[1-9][0-9]*$/.test(ctx.str('cursor')) || Number(ctx.str('cursor')) > 2147483647)) throw new CliValidationError('--cursor must be a version number returned as nextCursor.'); },
  dryRun: (ctx) => preview(ctx, API, pageQuery(ctx)),
  execute: (ctx) => kbApi(ctx, 'GET', API, pageQuery(ctx), undefined, apiOptions),
};
export const versionShow: Command = {
  service: 'kb', command: '+version-show', risk: 'read', description: 'Read one published version summary without reading current sources.',
  flags: [...targetFlags, versionFlag], validate: validateVersion,
  dryRun: (ctx) => preview(ctx, versionEndpoint(ctx), query(ctx)),
  execute: (ctx) => kbApi(ctx, 'GET', versionEndpoint(ctx), query(ctx), undefined, apiOptions),
};
export const versionSources: Command = {
  service: 'kb', command: '+version-sources', risk: 'read', description: 'List historical sources and stable IDs from one immutable version.',
  flags: [...targetFlags, versionFlag, ...pagingFlags, { name: 'source-type', type: 'string', desc: 'Optional source type filter: file | url | zip' }],
  validate: (ctx) => { validateVersion(ctx); validatePage(ctx); if (ctx.str('source-type') && !['file', 'url', 'zip'].includes(ctx.str('source-type'))) throw new CliValidationError('--source-type must be file, url, or zip.'); },
  dryRun: (ctx) => preview(ctx, versionEndpoint(ctx, '/sources'), { ...pageQuery(ctx), ...(ctx.str('source-type') ? { sourceType: ctx.str('source-type') } : {}) }),
  execute: (ctx) => kbApi(ctx, 'GET', versionEndpoint(ctx, '/sources'), { ...pageQuery(ctx), ...(ctx.str('source-type') ? { sourceType: ctx.str('source-type') } : {}) }, undefined, apiOptions),
};
export const versionDiff: Command = {
  service: 'kb', command: '+version-diff', risk: 'read', description: 'Compare historical source additions, deletions, content, and metadata between two versions.',
  flags: [...targetFlags, { ...versionFlag, name: 'from', desc: 'Before version number' }, { ...versionFlag, name: 'to', desc: 'After version number' }],
  validate: (ctx) => { validateTarget(ctx); positiveInteger(ctx, 'from'); positiveInteger(ctx, 'to'); },
  dryRun: (ctx) => preview(ctx, `${API}/compare`, { ...query(ctx), from: ctx.num('from'), to: ctx.num('to') }),
  execute: (ctx) => kbApi(ctx, 'GET', `${API}/compare`, { ...query(ctx), from: ctx.num('from'), to: ctx.num('to') }, undefined, apiOptions),
};
export const versionTree: Command = {
  service: 'kb', command: '+version-tree', risk: 'read', description: 'List a historical ZIP or URL source directory without changing current files.',
  flags: [...targetFlags, versionFlag, sourceFlag, pathFlag, ...pagingFlags],
  validate: (ctx) => { validateSource(ctx); validatePath(ctx); validatePage(ctx); },
  dryRun: (ctx) => preview(ctx, sourceEndpoint(ctx, 'tree'), { ...pageQuery(ctx), path: ctx.str('path') }),
  execute: (ctx) => kbApi(ctx, 'GET', sourceEndpoint(ctx, 'tree'), { ...pageQuery(ctx), path: ctx.str('path') }, undefined, apiOptions),
};
export const versionRead: Command = {
  service: 'kb', command: '+version-read', risk: 'read', description: 'Preview one historical directory child file; unsupported or oversized files return metadata only.',
  flags: [...targetFlags, versionFlag, sourceFlag, { ...pathFlag, required: true }],
  validate: (ctx) => { validateSource(ctx); validatePath(ctx, true); },
  dryRun: (ctx) => preview(ctx, sourceEndpoint(ctx, 'file'), { ...query(ctx), path: ctx.str('path') }),
  execute: (ctx) => kbApi(ctx, 'GET', sourceEndpoint(ctx, 'file'), { ...query(ctx), path: ctx.str('path') }, undefined, apiOptions),
};
export const versionDownload: Command = {
  service: 'kb', command: '+version-download', risk: 'read', description: 'Download one ordinary historical file source to a new local file. ZIP/URL directories cannot be downloaded.',
  flags: [...targetFlags, versionFlag, sourceFlag, { name: 'output', type: 'string', required: true, desc: 'New local output path; existing files are never overwritten' }],
  validate: (ctx) => { validateSource(ctx); if (!ctx.str('output').trim()) throw new CliValidationError('--output is required.'); },
  dryRun: (ctx) => ({ ...preview(ctx, sourceEndpoint(ctx, 'raw'), query(ctx)), output: path.resolve(ctx.str('output')) }),
  execute: async (ctx) => {
    const result = await kbApi(ctx, 'GET', sourceEndpoint(ctx, 'raw'), query(ctx), undefined, { ...apiOptions, responseType: 'bytes' });
    const output = path.resolve(ctx.str('output'));
    const bytes = Buffer.from(result.bytes);
    await fs.writeFile(output, bytes, { flag: 'wx' });
    return { versionNumber: ctx.num('version'), sourceId: ctx.str('id').trim(), sizeBytes: String(bytes.length), output };
  },
};
function rollbackBody(ctx: RuntimeContext) { return { requestId: ctx.str('request-id'), expectedLatestVersionId: ctx.str('expected-latest-version-id') }; }
export const rollback: Command = {
  service: 'kb', command: '+rollback', risk: 'high-risk-write',
  description: 'Restore an earlier version as a new publication. Replace target-source drafts, delete other compiled sources, and preserve unpublished additions. Reuse request-id on network retries.',
  flags: [...targetFlags, versionFlag,
    { name: 'request-id', type: 'string', required: true, maxLength: 191, desc: 'Caller-generated stable ASCII request ID; reuse exactly for retries of this logical operation' },
    { name: 'expected-latest-version-id', type: 'string', required: true, maxLength: 191, desc: 'latestVersionId returned by +versions; conflicts require fresh discovery and a new intentional request' }],
  validate: (ctx) => { validateVersion(ctx); if (!/^[A-Za-z0-9_-]{1,191}$/.test(ctx.str('request-id'))) throw new CliValidationError('--request-id must contain 1-191 ASCII letters, digits, underscores, or hyphens.'); const latest = ctx.str('expected-latest-version-id'); if (!latest || latest.length > 191) throw new CliValidationError('--expected-latest-version-id must contain 1 to 191 characters.'); },
  dryRun: (ctx) => preview(ctx, versionEndpoint(ctx, '/rollback'), query(ctx), rollbackBody(ctx)),
  execute: (ctx) => kbApi(ctx, 'POST', versionEndpoint(ctx, '/rollback'), query(ctx), rollbackBody(ctx), apiOptions),
};
export const rollbackStatus: Command = {
  service: 'kb', command: '+rollback-status', risk: 'read', description: 'Read one persisted rollback operation without polling. A running operation with errorCode requires administrator review; never retry it as a new write.',
  flags: [...targetFlags, { name: 'operation-id', type: 'string', required: true, minLength: 1, maxLength: 191, desc: 'operationId returned by +rollback' }],
  validate: (ctx) => { validateTarget(ctx); if (!ctx.str('operation-id').trim() || ctx.str('operation-id').length > 191) throw new CliValidationError('--operation-id must contain 1 to 191 characters.'); },
  dryRun: (ctx) => preview(ctx, `${API}/operations/${encodeURIComponent(ctx.str('operation-id').trim())}`, query(ctx)),
  execute: (ctx) => kbApi(ctx, 'GET', `${API}/operations/${encodeURIComponent(ctx.str('operation-id').trim())}`, query(ctx), undefined, apiOptions),
};
