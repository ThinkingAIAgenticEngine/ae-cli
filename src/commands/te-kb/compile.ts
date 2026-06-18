import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/external/knowledge-bases/compile';
const VALID_MODES = new Set(['incremental', 'full']);

function getMode(ctx: RuntimeContext): string {
  const mode = ctx.str('mode') || 'incremental';
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid --mode: ${mode}. Must be one of: incremental | full`);
  }
  return mode;
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  return {
    name: ctx.str('name'),
    mode: getMode(ctx),
  };
}

export const compile: Command = {
  service: 'kb',
  command: '+compile',
  description: 'Compile a knowledge.',
  flags: [
    { name: 'name', type: 'string', required: true, desc: 'Knowledge base name' },
    { name: 'mode', type: 'string', required: false, default: 'incremental', desc: 'Compile mode: incremental | full (default: incremental)' },
  ],
  risk: 'write',
  validate: (ctx) => {
    getMode(ctx);
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx)),
};
