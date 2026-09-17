import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError, PermissionError } from '../../core/errors.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

import { CapabilityGatewayError } from '../../core/capability-api.js';

const API_PATH = '/agent/api/external/knowledge-bases/sources/check-updates';
function body(ctx: RuntimeContext) {
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  return { name: ctx.str('name').trim(), sourceId: ctx.str('id').trim(), ...(scope ? { scope } : {}) };
}

export const sourceCheckUpdates: Command = {
  service: 'kb', resource: 'source', command: 'check-updates', risk: 'write',
  description: 'Check one compiled Feishu URL source for updates using the scheduled detector. Marks changes without compiling. Existing pending changes are preserved; updated=0 does not prove identical content.',
  flags: [
    { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 200, desc: 'Knowledge base name' },
    { name: 'id', type: 'string', required: true, minLength: 1, maxLength: 191, desc: 'Stable Feishu source ID from kb +list-sources' },
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
  execute: async (ctx) => {
    try {
      return await kbApi(ctx, 'POST', API_PATH, {}, body(ctx), { preserveErrorMetadata: true });
    } catch (error) {
      const hint = 'Read kb +list-sources to confirm the current source state before retrying.';
      if (error instanceof PermissionError) {
        throw new PermissionError('Source write permission is required for this knowledge base.', error.code, 'Request source write access; signing in again does not grant permission.');
      }
      if (error instanceof CapabilityGatewayError) {
        const messages: Record<string, string> = {
          INVALID_REQUEST: 'Invalid source update-check parameters.',
          KB_NOT_FOUND: 'The knowledge base was not found or is not accessible.',
          SOURCE_NOT_FOUND: 'The source was not found in the selected knowledge base.',
          SOURCE_NOT_FEISHU: 'Only Feishu URL sources support update checks.',
          SOURCE_NOT_COMPILED: 'The source must finish compilation before checking for updates.',
          SOURCE_CHECK_FAILED: 'The Feishu source update check failed. Check server detection logs.',
          SOURCE_CHECK_UNAVAILABLE: 'The source changed or could not be selected for detection.',
          SOURCE_CHECK_INTERNAL_ERROR: 'The Feishu source update check could not complete.',
        };
        throw new CapabilityGatewayError(messages[error.code ?? ''] ?? 'The source update-check request failed.', error.code, error.httpStatus, hint, error.meta);
      }
      if (error instanceof Error && /[^\x00-\x7f]/.test(error.message)) {
        error.message = 'The source update-check request failed. Check credentials, rate limits and server logs.';
      }
      throw error;
    }
  },
};
