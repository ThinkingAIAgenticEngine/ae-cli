import { createMcpCommand } from '../shared.js';

export const getTrackProgram = createMcpCommand({
  command: '+get_track_program',
  description: 'Query tracking-plan metadata (bury program)',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
  }),
});
