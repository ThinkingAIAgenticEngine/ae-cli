import { createMcpCommand, optionalString } from '../shared.js';

export const createSpace = createMcpCommand({
  command: '+create_space',
  description: 'Create a new space in a project. A space organizes dashboards and assets under a named container.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'space_name', type: 'string', required: true, desc: 'Space name (1-64 characters)' },
    { name: 'space_desc', type: 'string', required: false, desc: 'Optional space description (max 200 characters)' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    spaceName: ctx.str('space_name'),
    spaceDesc: optionalString(ctx, 'space_desc'),
  }),
});
