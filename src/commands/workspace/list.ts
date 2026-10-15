import type { Command, RuntimeContext } from '../../framework/types.js';
import { buildWorkspaceCliUrl, getWorkspaceApi, WORKSPACE_CLI_BASE_PATH } from './client.js';
import { assertOneOf, optional, queryPath, WORKSPACE_SERVICE } from './shared.js';

const WORKSPACE_TYPES = ['personal', 'shared'] as const;
const WORKSPACE_STATUSES = ['ACTIVE', 'ARCHIVED', 'CREATING', 'DELETING'] as const;

function listPath(ctx: RuntimeContext): string {
  return queryPath(`${WORKSPACE_CLI_BASE_PATH}/agent-spaces`, {
    type: optional(ctx, 'type'),
    status: optional(ctx, 'status'),
    query: optional(ctx, 'query'),
    cursor: optional(ctx, 'cursor'),
    limit: ctx.num('limit') || 20,
  });
}

export const listWorkspaces: Command = {
  service: WORKSPACE_SERVICE,
  command: 'list',
  description: 'List AgentSpaces accessible to the current user',
  flags: [
    { name: 'type', type: 'string', required: false, desc: 'Filter by type: personal | shared' },
    { name: 'status', type: 'string', required: false, desc: 'Filter by status: ACTIVE | ARCHIVED | CREATING | DELETING' },
    { name: 'query', type: 'string', required: false, desc: 'Search by AgentSpace name' },
    { name: 'cursor', type: 'string', required: false, desc: 'Pagination cursor' },
    { name: 'limit', type: 'number', required: false, default: 20, min: 1, max: 50, desc: 'Page size, 1-50; default 20' },
  ],
  risk: 'read',
  validate: (ctx) => {
    assertOneOf('type', optional(ctx, 'type'), WORKSPACE_TYPES);
    assertOneOf('status', optional(ctx, 'status'), WORKSPACE_STATUSES);
  },
  dryRun: (ctx) => ({ method: 'GET', url: buildWorkspaceCliUrl(ctx, listPath(ctx)) }),
  execute: (ctx) => getWorkspaceApi(ctx, listPath(ctx)),
};
