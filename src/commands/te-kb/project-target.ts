import type { Command } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';

const API_PATH = '/agent/api/project-semantic-target';

// Transitional: Agent KB owns this REST API; migrate when KB enters capability gateway.
export const projectTargetGet: Command = {
  service: 'kb',
  resource: 'project-target',
  command: 'get',
  description: 'Resolve the company project semantic KB on the server, including disabled and inaccessible candidates. Never select a different target on permission denial.',
  flags: [{ name: 'project-id', type: 'string', required: true, desc: 'Exact project ID' }],
  risk: 'read',
  validate(ctx) {
    if (!/^[1-9]\d{0,15}$/.test(ctx.str('project-id'))) throw new Error('A valid --project-id is required.');
  },
  dryRun(ctx) {
    return { method: 'GET', url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`, params: { projectId: ctx.str('project-id') } };
  },
  execute: async (ctx) => kbApi(ctx, 'GET', API_PATH, { projectId: ctx.str('project-id') }),
};
