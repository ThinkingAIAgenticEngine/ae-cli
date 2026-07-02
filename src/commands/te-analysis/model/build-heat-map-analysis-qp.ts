import { createMcpCommand } from '../shared.js';

export const buildHeatMapAnalysisQp = createMcpCommand({
  command: '+build_heat_map_analysis_qp',
  description: 'Build a validated heatmap-analysis QP from structured heatmap intent. Heatmap analysis visualizes user interaction intensity on a 2D coordinate plane (e.g. screen position). Call before query_adhoc. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for heatmap analysis.' },
    { name: 'heat_map', type: 'json', required: true, desc: 'Heatmap intent JSON. Required fields: hotEvent, hotAggregation, xProp, yProp. Optional: hotProperty, filters, relation.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    heatMap: ctx.json('heat_map'),
  }),
});
