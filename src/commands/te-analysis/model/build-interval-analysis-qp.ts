import { createMcpCommand, optionalBoolean, optionalJson, optionalString } from '../shared.js';

export const buildIntervalAnalysisQp = createMcpCommand({
  command: '+build_interval_analysis_qp',
  description: 'Build a validated interval-analysis QP from structured interval intent. Interval analysis measures the time elapsed between an initial event and a return event per user. Call before query_adhoc. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for interval analysis.' },
    { name: 'interval', type: 'json', required: true, desc: 'Interval analysis intent JSON. Required fields: initialEvent, returnEvent, window (value+unit). Optional: relationEventPropertyName, groups, filters, initialFilters, returnFilters, initialFilterRelation, returnFilterRelation.' },
    { name: 'relation', type: 'string', required: false, desc: 'Filter relation for top-level interval filters. Supported values: and, or. Default: and.' },
    { name: 'time_particle_size', type: 'string', required: false, desc: 'Time granularity. Allowed values: day, week, month. Defaults to day when omitted.' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, resolve only authenticated assets while building the QP.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    interval: ctx.json('interval'),
    relation: optionalString(ctx, 'relation'),
    timeParticleSize: optionalString(ctx, 'time_particle_size'),
    authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
  }),
});
