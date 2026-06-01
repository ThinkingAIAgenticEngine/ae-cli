import { createMcpCommand, optionalJson } from '../shared.js';

export const buildEventAnalysisQp = createMcpCommand({
  command: '+build_event_analysis_qp',
  description: 'Build a validated event-analysis QP from structured intent. Call before query_adhoc for event ad-hoc analysis. Do not call get_analysis_query_schema/list_events/list_properties/list_metrics/get_metric first; the builder resolves events, properties, and saved metric names internally. For a saved metric, pass its name in metrics[].event. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for event analysis.' },
    { name: 'metrics', type: 'json', required: true, desc: 'Required event metrics JSON array.' },
    { name: 'time_particle_size', type: 'string', required: false, desc: 'Optional time granularity. Default: total.' },
    { name: 'groups', type: 'json', required: false, desc: 'Optional group-by dimensions JSON array.' },
    { name: 'filters', type: 'json', required: false, desc: 'Optional global filters JSON array.' },
    { name: 'relation', type: 'string', required: false, desc: 'Optional filter relation. Supported values: and, or. Default: and.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    metrics: ctx.json('metrics'),
    timeParticleSize: ctx.str('time_particle_size') || undefined,
    groups: optionalJson(ctx, 'groups'),
    filters: optionalJson(ctx, 'filters'),
    relation: ctx.str('relation') || undefined,
  }),
});
