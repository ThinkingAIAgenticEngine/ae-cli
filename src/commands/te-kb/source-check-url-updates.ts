import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError } from '../../core/errors.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases/sources/check-url-updates';
function body(ctx: RuntimeContext) {
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  return { name: ctx.str('name').trim(), sourceId: ctx.str('id').trim(), ...(scope ? { scope } : {}) };
}

export const sourceCheckUrlUpdates: Command = {
  service: 'kb', resource: 'source', command: 'check-url-updates', risk: 'write',
  description: 'Submit an asynchronous update check for one compiled custom URL source. Success means accepted only. Read kb +list-sources for update markers; an unchanged state does not prove completion. Does not compile.',
  flags: [
    { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 200, desc: 'Knowledge base name' },
    { name: 'id', type: 'string', required: true, minLength: 1, maxLength: 191, desc: 'Stable custom URL source ID from kb +list-sources' },
    { name: 'scope', type: 'string', desc: 'Exact scope: personal | company (omit for personal then company lookup)' },
  ],
  validate: (ctx) => {
    for (const [flag, max] of [['name', 200], ['id', 191]] as const) {
      const value = ctx.str(flag).trim();
      if (!value || value.length > max) throw new CliValidationError(`Invalid --${flag}: expected 1-${max} characters.`);
    }
    getExternalKnowledgeBaseTargetScope(ctx);
  },
  dryRun: (ctx) => ({ method: 'POST', url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`, body: body(ctx) }),
  execute: (ctx) => kbApi(ctx, 'POST', API_PATH, {}, body(ctx), { preserveErrorMetadata: true }),
};
