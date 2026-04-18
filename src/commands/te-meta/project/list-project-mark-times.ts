import { createMcpCommand, optionalNumber } from '../shared.js';

export const listProjectMarkTimes = createMcpCommand({
  command: '+list_project_mark_times',
  description: 'List project date markers',
  flags: [
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Marker time zone offset' },
  ],
  risk: 'read',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    zoneOffset: optionalNumber(ctx, 'zone_offset'),
  }),
});
