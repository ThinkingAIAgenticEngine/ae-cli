import type { Command, Flag, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { CliApiError, CliValidationError } from '../../core/errors.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const root = '/agent/api/external/knowledge-bases';
const options = { preserveErrorMetadata: true, retryUnauthorized: false };
const targets: Flag[] = [
  { name: 'name', type: 'string', required: true, desc: 'Knowledge base name' },
  {
    name: 'scope',
    type: 'string',
    desc: 'personal | company; omit for personal then company lookup',
  },
];
const candidate: Flag = {
  name: 'candidate',
  type: 'string',
  required: true,
  desc: 'Immutable candidate ID returned by publication get',
};
function selector(ctx: RuntimeContext) {
  return {
    name: ctx.str('name'),
    ...(getExternalKnowledgeBaseTargetScope(ctx)
      ? { scope: getExternalKnowledgeBaseTargetScope(ctx) }
      : {}),
  };
}
function candidatePath(ctx: RuntimeContext) {
  const id = ctx.str('candidate');
  if (!/^[A-Za-z0-9_-]{1,191}$/.test(id)) throw new CliValidationError('Invalid --candidate');
  return `${root}/publication-candidates/${id}`;
}
function targetCommand(
  resource: string,
  command: string,
  suffix: string,
  extra: Flag[] = [],
): Command {
  const method = command === 'discard' ? 'POST' : 'GET';
  const endpoint = (ctx: RuntimeContext) =>
    resource === 'publication' ? `${root}/publication` : candidatePath(ctx) + suffix;
  const params = (ctx: RuntimeContext) => ({
    ...selector(ctx),
    ...(command === 'read' ? { path: ctx.str('path') } : {}),
    ...(command === 'changes' ? changesParams(ctx) : {}),
  });
  return {
    service: 'kb',
    resource,
    command,
    risk: command === 'discard' ? 'high-risk-write' : 'read',
    description:
      command === 'discard'
        ? 'Close a retryable failed candidate after a confirmed failed publication; pending requests use approval cancel.'
        : `Read ${resource} ${command} from immutable publication metadata.`,
    flags: [...targets, ...(resource === 'candidate' ? [candidate] : []), ...extra],
    validate: (ctx) => {
      selector(ctx);
      endpoint(ctx);
      if (command === 'changes') changesParams(ctx);
    },
    dryRun: (ctx) => ({
      method,
      url: ctx.host().replace(/\/$/, '') + endpoint(ctx),
      params: params(ctx),
      ...(method === 'POST' ? { body: {} } : {}),
    }),
    execute: async (ctx) => {
      const result = await kbApi(
        ctx,
        method,
        endpoint(ctx),
        params(ctx),
        method === 'POST' ? {} : undefined,
        options,
      );
      if (command === 'changes') {
        const query = changesParams(ctx);
        const directoryRequested =
          !query.entryId &&
          ['group', 'search', 'change', 'offset', 'limit'].some((key) => key in query);
        const memberRequested =
          query.entryId && ['fileOffset', 'fileLimit', 'fileSearch'].some((key) => key in query);
        const body =
          result && typeof result === 'object' ? (result as Record<string, unknown>) : {};
        if ((directoryRequested && !body.page) || (memberRequested && !body.filePage))
          throw new CliApiError(
            'This server does not support filtered or paginated candidate changes.',
            {
              code: 'KB_CANDIDATE_PAGING_UNSUPPORTED',
              hint: 'Deploy a compatible server or omit the new paging and filter flags.',
            },
          );
      }
      return result;
    },
  };
}
export const publicationGet = targetCommand('publication', 'get', '');
export const candidateGet = targetCommand('candidate', 'get', '');
export const candidateRead = targetCommand('candidate', 'read', '/files', [
  {
    name: 'path',
    type: 'string',
    required: true,
    desc: 'index.md, CLAUDE.md or wiki Markdown path from the candidate',
  },
]);
function changesParams(ctx: RuntimeContext) {
  const entryId = ctx.str('entry-id');
  const file = ctx.str('file');
  const context = ctx.optionalNum('context');
  if (file && !entryId) throw new CliValidationError('--file requires --entry-id');
  if (context !== undefined && context !== 0 && context !== 3)
    throw new CliValidationError('--context must be 0 or 3');
  const group = ctx.str('group');
  const change = ctx.str('change');
  const search = ctx.str('search');
  const fileSearch = ctx.str('file-search');
  if (group && !['sources', 'wiki', 'index'].includes(group))
    throw new CliValidationError('--group must be sources, wiki or index');
  if (change && !['added', 'modified', 'deleted'].includes(change))
    throw new CliValidationError('--change must be added, modified or deleted');
  if (search.length > 500 || fileSearch.length > 500)
    throw new CliValidationError('Search text must not exceed 500 characters');
  const paging: Record<string, number> = {};
  for (const [flag, key, min, max] of [
    ['offset', 'offset', 0, 1000000],
    ['limit', 'limit', 1, 200],
    ['file-offset', 'fileOffset', 0, 1000000],
    ['file-limit', 'fileLimit', 1, 200],
  ] as const) {
    const value = ctx.optionalNum(flag);
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value < min || value > max)
      throw new CliValidationError(`--${flag} must be an integer between ${min} and ${max}`);
    paging[key] = value;
  }
  if ((fileSearch || 'fileOffset' in paging || 'fileLimit' in paging) && !entryId)
    throw new CliValidationError('Member search and pagination require --entry-id');
  return {
    ...paging,
    ...(group ? { group } : {}),
    ...(change ? { change } : {}),
    ...(search ? { search } : {}),
    ...(fileSearch ? { fileSearch } : {}),
    ...(entryId ? { entryId } : {}),
    ...(file ? { file } : {}),
    ...(context !== undefined ? { context } : {}),
  };
}
export const candidateChanges = targetCommand('candidate', 'changes', '/changes', [
  { name: 'group', type: 'string', desc: 'Filter changed entries: sources | wiki | index' },
  { name: 'search', type: 'string', desc: 'Search changed names or paths (up to 500 characters)' },
  { name: 'change', type: 'string', desc: 'Filter change type: added | modified | deleted' },
  { name: 'offset', type: 'number', desc: 'Changed entry offset (0 to 1000000)' },
  {
    name: 'limit',
    type: 'number',
    desc: 'Changed entry page size (1 to 200); omit for legacy full list',
  },
  { name: 'file-offset', type: 'number', desc: 'Changed member offset (0 to 1000000)' },
  { name: 'file-limit', type: 'number', desc: 'Changed member page size (1 to 200)' },
  { name: 'file-search', type: 'string', desc: 'Search changed member paths' },
  {
    name: 'entry-id',
    type: 'string',
    desc: 'Changed entry ID returned by candidate changes; omit to list changes',
  },
  {
    name: 'file',
    type: 'string',
    desc: 'Changed member path returned by an entry detail; requires --entry-id',
  },
  {
    name: 'context',
    type: 'number',
    desc: 'Unchanged context lines: 0 (default) or 3',
  },
]);
export const candidateDiscard = targetCommand('candidate', 'discard', '/discard');
function createBody(ctx: RuntimeContext) {
  const sources = ctx.json('sources');
  if (
    sources !== undefined &&
    sources !== null &&
    (!Array.isArray(sources) ||
      sources.length > 100 ||
      sources.some(
        (source) =>
          !source ||
          !['personal', 'company', 'system'].includes(source.scope) ||
          typeof source.name !== 'string' ||
          !source.name ||
          Object.keys(source).some((key) => !['name', 'scope'].includes(key)),
      ))
  )
    throw new CliValidationError('--sources must be an array of {scope,name}');
  return {
    ...(sources ? { sources } : {}),
    ...(ctx.str('locale') ? { locale: ctx.str('locale') } : {}),
  };
}
export const readContextCreate: Command = {
  service: 'kb',
  resource: 'read-context',
  command: 'create',
  risk: 'read',
  description: 'Pin the current authorized formal KB views for subsequent reads (15 minutes).',
  flags: [
    {
      name: 'sources',
      type: 'json',
      desc: 'Optional array of {scope,name}; omit to discover authorized published KBs',
    },
    { name: 'locale', type: 'string', desc: 'zh | en | ja | ko' },
  ],
  validate: (ctx) => {
    createBody(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: ctx.host().replace(/\/$/, '') + `${root}/read-contexts`,
    body: createBody(ctx),
  }),
  execute: (ctx) => kbApi(ctx, 'POST', `${root}/read-contexts`, {}, createBody(ctx), options),
};
export const readContextRelease: Command = {
  service: 'kb',
  resource: 'read-context',
  command: 'release',
  risk: 'write',
  description: 'Release a read context owned by the current user.',
  flags: [
    {
      name: 'id',
      type: 'string',
      required: true,
      desc: 'readContextId returned by read-context create',
    },
  ],
  dryRun: (ctx) => ({
    method: 'DELETE',
    url:
      ctx.host().replace(/\/$/, '') + `${root}/read-contexts/${encodeURIComponent(ctx.str('id'))}`,
  }),
  execute: (ctx) =>
    kbApi(
      ctx,
      'DELETE',
      `${root}/read-contexts/${encodeURIComponent(ctx.str('id'))}`,
      {},
      {},
      options,
    ),
};
export const publicationCommands = [
  publicationGet,
  candidateGet,
  candidateRead,
  candidateChanges,
  candidateDiscard,
  readContextCreate,
  readContextRelease,
];
