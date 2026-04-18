import { createMcpCommand } from '../shared.js';

export const refreshTag = createMcpCommand({
  command: '+refresh_tag',
  description: 'Trigger tag recomputation asynchronously',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'tag_name', type: 'string', required: true, desc: 'Tag name' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    tagName: ctx.str('tag_name'),
  }),
});
