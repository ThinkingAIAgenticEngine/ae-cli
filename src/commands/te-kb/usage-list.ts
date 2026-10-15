import type { Command, RuntimeContext } from '../../framework/types.js';
import { CliValidationError, PermissionError } from '../../core/errors.js';
import { CapabilityGatewayError } from '../../core/capability-api.js';
import { kbApi } from '../../core/mcp-access.js';
import { getExternalKnowledgeBaseTargetScope } from './target-scope.js';

const API_PATH = '/agent/api/external/knowledge-bases/usage-logs';

function query(ctx: RuntimeContext) {
  const scope = getExternalKnowledgeBaseTargetScope(ctx);
  return {
    name: ctx.str('name').trim(),
    ...(scope ? { scope } : {}),
    page: ctx.num('page'),
    pageSize: ctx.num('page-size'),
  };
}

export const usageList: Command = {
  service: 'kb', resource: 'usage', command: 'list', risk: 'read',
  description: 'List one page of compilation usage logs. durationMs is elapsed time in milliseconds; null means not recorded.',
  flags: [
    { name: 'name', type: 'string', required: true, minLength: 1, maxLength: 200, desc: 'Exact knowledge base name from kb +list' },
    { name: 'scope', type: 'string', desc: 'Exact scope: personal | company (omit for personal then company lookup)' },
    { name: 'page', type: 'number', default: 1, min: 1, max: 2147483647, desc: 'Page number, starting at 1' },
    { name: 'page-size', type: 'number', default: 20, min: 1, max: 100, desc: 'Records per page, from 1 to 100' },
  ],
  validate: (ctx) => {
    const name = ctx.str('name').trim();
    if (!name || name.length > 200) throw new CliValidationError('--name must contain 1 to 200 characters.');
    getExternalKnowledgeBaseTargetScope(ctx);
    for (const [flag, max] of [['page', 2147483647], ['page-size', 100]] as const) {
      const value = ctx.num(flag);
      if (!Number.isInteger(value) || value < 1 || value > max) {
        throw new CliValidationError(`--${flag} must be an integer from 1 to ${max}.`);
      }
    }
  },
  dryRun: (ctx) => ({ method: 'GET', url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`, params: query(ctx) }),
  execute: async (ctx) => {
    try {
      return await kbApi(ctx, 'GET', API_PATH, query(ctx), undefined, { preserveErrorMetadata: true });
    } catch (error) {
      if (error instanceof PermissionError) {
        error.message = 'Permission denied when reading knowledge base usage logs.';
      } else if (error instanceof CapabilityGatewayError) {
        const messages: Record<string, string> = {
          KB_USAGE_LOGS_INVALID_REQUEST: 'Invalid knowledge base usage query parameters.',
          KB_USAGE_LOGS_RATE_LIMITED: 'Knowledge base usage query rate limit exceeded. Try again later.',
          KB_USAGE_LOGS_NOT_FOUND: 'Knowledge base not found in the requested scope.',
          KB_USAGE_LOGS_INTERNAL_ERROR: 'Failed to read knowledge base usage logs. Try again later.',
        };
        if (error.code && messages[error.code]) error.message = messages[error.code];
      }
      throw error;
    }
  },
};
