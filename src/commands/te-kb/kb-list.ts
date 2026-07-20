import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/list';
const DEFAULT_BUILD_STATUS = 'compiled';

function getBuildStatus(ctx: RuntimeContext): string {
  return ctx.str('build-status') || DEFAULT_BUILD_STATUS;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    buildStatus: getBuildStatus(ctx),
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
    {
      name: 'build-status',
      type: 'string',
      required: false,
      default: DEFAULT_BUILD_STATUS,
      desc: 'Filter by knowledge base build status (default: compiled)',
    },
    { name: 'locale', type: 'string', required: false, desc: 'Optional locale: zh | en | ja | ko' },
  ],
  risk: 'read',
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
