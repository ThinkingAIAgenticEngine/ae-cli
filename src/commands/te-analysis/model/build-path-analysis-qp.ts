import { createMcpCommand } from '../shared.js';

export const buildPathAnalysisQp = createMcpCommand({
  command: '+build_path_analysis_qp',
  description: 'Build a validated path-analysis QP from structured path intent. Path analysis visualizes user navigation flows between events within a session. Call before query_adhoc. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for path analysis.' },
    { name: 'path', type: 'json', required: true, desc: 'Path analysis intent JSON. Required fields: sourceEvent, eventNames (array), sessionInterval, sessionUnit. Optional: sourceType (0=forward, 1=backward, default 0).' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    path: ctx.json('path'),
  }),
});
