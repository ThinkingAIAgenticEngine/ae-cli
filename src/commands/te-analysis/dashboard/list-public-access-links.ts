import { createMcpCommand } from '../shared.js';

export const listPublicAccessLinks = createMcpCommand({
  command: '+list_public_access_links',
  description: 'List public access links in the project. Returns link IDs, short codes, access targets, status, effective time, expiration time, and related metadata.',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
  }),
});
