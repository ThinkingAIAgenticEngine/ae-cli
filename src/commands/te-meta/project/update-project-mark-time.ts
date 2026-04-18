import { createMcpCommand, optionalNumber } from '../shared.js';

export const updateProjectMarkTime = createMcpCommand({
  command: '+update_project_mark_time',
  description: 'Update an existing project date marker',
  flags: [
    { name: 'mark_time_id', type: 'number', required: true, desc: 'Mark time ID' },
    { name: 'project_id', type: 'number', required: true, alias: 'p', desc: 'Project ID' },
    { name: 'marked_at', type: 'string', required: true, desc: 'Marked time yyyy-MM-dd HH:mm' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Marker time zone offset' },
    { name: 'content', type: 'string', required: true, desc: 'Marker content' },
    { name: 'is_visible', type: 'number', required: false, desc: 'Whether the marker is visible. Default: 1' },
  ],
  risk: 'write',
  mcpService: 'te_analysis_extend',
  buildArgs: (ctx) => ({
    markTimeId: ctx.num('mark_time_id'),
    projectId: ctx.num('project_id'),
    markedAt: ctx.str('marked_at'),
    zoneOffset: optionalNumber(ctx, 'zone_offset'),
    content: ctx.str('content'),
    isVisible: optionalNumber(ctx, 'is_visible'),
  }),
});
