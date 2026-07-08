import { createMcpCommand, optionalBoolean } from '../shared.js';

export const buildAttributionAnalysisQp = createMcpCommand({
  command: '+build_attribution_analysis_qp',
  description: 'Build a validated attribution-analysis QP from structured attribution intent. Attribution analysis assigns conversion credit to touchpoint events that preceded a target conversion event. Call before query_adhoc. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for attribution analysis.' },
    { name: 'attribution', type: 'json', required: true, desc: 'Attribution intent JSON. Required fields: targetEvent, targetAggregation, attributionEvents (array), attributionModel (first/last/linear), window (value+unit). Optional: targetProperty, directConversion, filters, relation.' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, resolve only authenticated assets while building the QP.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    attribution: ctx.json('attribution'),
    authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
  }),
});
