import { kbExecutionContextRequired } from '../../core/kb-read-context.js';
import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import { printError } from '../../framework/output.js';

const API_PATH = '/agent/api/external/knowledge-bases/list';
const DEFAULT_BUILD_STATUS = 'compiled';
const VALID_BUILD_STATUSES = ['idle', 'pending', 'compiling', 'compiled', 'failed'] as const;

function getBuildStatus(ctx: RuntimeContext): string | undefined {
  return ctx.str('build-status') || (ctx.str('view') === 'published' || ctx.str('read-context') || kbExecutionContextRequired() ? undefined : DEFAULT_BUILD_STATUS);
}

function validateBuildStatus(ctx: RuntimeContext): void {
  const value = ctx.str('build-status');
  if (value && !VALID_BUILD_STATUSES.includes(value as (typeof VALID_BUILD_STATUSES)[number])) {
    printError(
      'validation',
      `Invalid --build-status: ${value}. Valid values: ${VALID_BUILD_STATUSES.join(' | ')} (omit to default to ${DEFAULT_BUILD_STATUS}).`,
    );
    process.exit(1);
  }
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    ...(getBuildStatus(ctx) ? { buildStatus: getBuildStatus(ctx) } : {}),
    ...(ctx.str("view") ? { view: ctx.str("view") } : {}),
  };
  const locale = ctx.str('locale');
  if (locale) body.locale = locale;
  return body;
}

export const kbList: Command = {
  service: 'kb',
  command: '+list',
  description:
    'List accessible knowledge bases via POST /agent/api/external/knowledge-bases/list. Filters by buildStatus (default: compiled). Returns KB metadata including buildStatus, without index.md navigation maps.',
  flags: [
    { name: 'view', type: 'string', required: false, desc: 'Use published for formal views without an implicit build-status filter' },
    { name: 'read-context', type: 'string', required: false, desc: 'Pin reads to an existing read context' },
    {
      name: 'build-status',
      type: 'string',
      required: false,
      desc: `Filter by knowledge base build status: ${VALID_BUILD_STATUSES.join(' | ')} (default: ${DEFAULT_BUILD_STATUS} when omitted)`,
    },
    { name: 'locale', type: 'string', required: false, desc: 'Optional locale: zh | en | ja | ko' },
  ],
  risk: 'read',
  validate: (ctx) => {
    validateBuildStatus(ctx);
    if (ctx.str('view') && ctx.str('view') !== 'published') throw new Error('Invalid --view: expected published');
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => {
    if (ctx.str('view') !== 'published' || ctx.str('read-context') || kbExecutionContextRequired())
      return kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx));
    // Capability negotiation is an actual context creation: old Hosts must fail closed.
    const endpoint = '/agent/api/external/knowledge-bases/read-contexts';
    const options = { preserveErrorMetadata: true, retryUnauthorized: false };
    const created = await kbApi(ctx, 'POST', endpoint, {}, ctx.str('locale') ? { locale: ctx.str('locale') } : {}, options);
    if (typeof created?.readContextId !== 'string' || !/^[A-Za-z0-9_-]{1,191}$/.test(created.readContextId))
      throw new Error('KB_READ_CONTEXT_CAPABILITY_UNAVAILABLE');
    const pinned = Object.create(ctx) as RuntimeContext;
    pinned.str = name => name === 'read-context' ? created.readContextId : ctx.str(name);
    try {
      return await kbApi(pinned, 'POST', API_PATH, {}, buildBody(ctx), options);
    } finally {
      await kbApi(ctx, 'DELETE', `${endpoint}/${encodeURIComponent(created.readContextId)}`, {}, {}, options);
    }
  },
};
