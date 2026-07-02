import { createMcpCommand, optionalJson, optionalString } from '../shared.js';

export const buildDistributionAnalysisQp = createMcpCommand({
  command: '+build_distribution_analysis_qp',
  description: 'Build a validated distribution-analysis QP from structured distribution metrics. Distribution analysis shows how a metric value is distributed across users or events. Call before query_adhoc. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for distribution analysis.' },
    { name: 'distribution_metrics', type: 'json', required: true, desc: 'Distribution metrics JSON array. Each item: event, aggregation (A200=count/A201=active-days/A202=active-hours/A103=sum etc.). Optional per item: property, percentile, intervalType, quotaIntervalArr, filters, relation.' },
    { name: 'time_particle_size', type: 'string', required: false, desc: 'Time granularity. Allowed values: day, week, month, total. Defaults to day when omitted.' },
    { name: 'groups', type: 'json', required: false, desc: 'Optional group-by dimensions JSON array.' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional global filters JSON array.' },
    { name: 'relation', type: 'string', required: false, desc: 'Optional filter relation. Supported values: and, or. Default: and.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    distributionMetrics: ctx.json('distribution_metrics'),
    timeParticleSize: optionalString(ctx, 'time_particle_size'),
    groups: optionalJson(ctx, 'groups'),
    filters: optionalJson(ctx, 'filters'),
    relation: optionalString(ctx, 'relation'),
  }),
});
