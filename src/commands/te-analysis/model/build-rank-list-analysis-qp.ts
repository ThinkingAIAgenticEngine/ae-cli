import { createMcpCommand, optionalBoolean } from '../shared.js';

export const buildRankListAnalysisQp = createMcpCommand({
  command: '+build_rank_list_analysis_qp',
  description: 'Build a validated rank-list-analysis QP from structured rank list intent. Rank list analysis ranks entities (users, items, etc.) by a metric value. Call before query_adhoc. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for rank list analysis.' },
    { name: 'rank_list', type: 'json', required: true, desc: 'Rank list intent JSON. Required fields: rankDimension (field), rankEvent, rankAggregation. Optional: rankProperty, rankType (rank/dense_rank/row_rank), orderBy (DESC/ASC), filters, relation.' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, resolve only authenticated assets while building the QP.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    rankList: ctx.json('rank_list'),
    authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
  }),
});
