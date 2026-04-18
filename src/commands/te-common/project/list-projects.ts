import { createMcpCommand } from '../shared.js';

export const listProjects = createMcpCommand({
  command: '+list_projects',
  description: 'List all projects accessible to the current user. No parameters are required. Returns project IDs, names, company IDs, project types, remarks, app IDs, and the user\'s current role in each project.',
  flags: [],
  risk: 'read',
  buildArgs: () => ({}),
});
