import { createMcpCommand } from '../shared.js';

export const listSpaces = createMcpCommand({
  command: '+list_spaces',
  description: 'List spaces and folders accessible to the current user in the project as a recursive tree. Use to resolve spaceId for create_dashboard / copy_dashboard, and toSpaceId / toFolderId / fromSpaceId / fromFolderId for move_dashboard and copy_dashboard.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
  }),
});
