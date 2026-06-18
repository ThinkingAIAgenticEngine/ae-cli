import type { Command } from '../../../framework/types.js';
import { kbApi } from '../../../core/mcp-access.js';
import { BASE_RUN_PATH } from '../shared.js';

export const listArtifacts: Command = {
  service: 'team',
  command: '+run-artifacts',
  description: 'List artifacts produced by a TeamRun.',
  flags: [
    { name: 'id', type: 'string', required: true, desc: 'TeamRun ID' },
    { name: 'artifact-type', type: 'string', required: false, desc: 'Filter by artifact type' },
    { name: 'include-content', type: 'boolean', required: false, desc: 'Include full artifact content (default false)' },
  ],
  risk: 'read',
  dryRun: (ctx) => {
    const params: Record<string, any> = {};
    const artifactType = ctx.str('artifact-type');
    if (artifactType) params.artifactType = artifactType;
    const includeContent = ctx.json('include-content');
    if (includeContent !== undefined) params.includeContent = includeContent;
    return {
      method: 'GET',
      url: `${ctx.host().replace(/\/$/, '')}${BASE_RUN_PATH}/${ctx.str('id')}/artifacts`,
      params,
    };
  },
  execute: async (ctx) => {
    const params: Record<string, any> = {};
    const artifactType = ctx.str('artifact-type');
    if (artifactType) params.artifactType = artifactType;
    const includeContent = ctx.json('include-content');
    if (includeContent !== undefined) params.includeContent = includeContent;
    return kbApi(ctx, 'GET', `${BASE_RUN_PATH}/${ctx.str('id')}/artifacts`, params);
  },
};
