import { createMcpCommand } from '../shared.js';

export const buildRetentionAnalysisQp = createMcpCommand({
  command: '+build_retention_analysis_qp',
  description: 'Build a validated retention-analysis QP from structured intent. Call before query_adhoc for retention ad-hoc analysis. Do not call get_analysis_query_schema/list_events/list_properties/list_metrics/get_metric first; the builder resolves events and properties internally. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'time_range', type: 'json', required: true, desc: 'Required time range JSON for retention analysis.' },
    { name: 'retention', type: 'json', required: true, desc: 'Required retention intent JSON.' },
    { name: 'relation', type: 'string', required: false, desc: 'Optional top-level retention filter relation. Supported values: and, or. Default: and.' },
    { name: 'time_particle_size', type: 'string', required: false, desc: 'Optional time granularity. Supported values: day, week, month.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    timeRange: ctx.json('time_range'),
    retention: ctx.json('retention'),
    relation: ctx.str('relation') || undefined,
    timeParticleSize: ctx.str('time_particle_size') || undefined,
  }),
});
