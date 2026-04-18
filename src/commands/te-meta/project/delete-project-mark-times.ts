import { createMcpCommand } from '../shared.js';

export const deleteProjectMarkTimes = createMcpCommand({
  command: '+delete_project_mark_times',
  description: 'Delete one or more project date markers',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'mark_time_ids', type: 'json', required: true, desc: 'Marker ID list JSON array' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    markTimeIds: ctx.json('mark_time_ids'),
  }),
});
