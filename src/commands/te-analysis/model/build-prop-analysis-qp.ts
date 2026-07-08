import { createMcpCommand, optionalBoolean } from '../shared.js';

export const buildPropAnalysisQp = createMcpCommand({
  command: '+build_prop_analysis_qp',
  description: 'Build a validated prop-analysis QP from structured intent. Call before query_adhoc for prop_analysis ad-hoc analysis. Do not call get_analysis_query_schema/list_properties/list_metrics/get_metric first; the builder resolves user properties internally. This command only builds qp and does not execute query_adhoc.',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID', alias: 'p' },
    { name: 'prop_analysis', type: 'json', required: true, desc: 'Required user property analysis intent JSON.' },
    { name: 'authenticated_only', type: 'boolean', required: false, desc: 'When true, resolve only authenticated assets while building the QP.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    projectId: ctx.num('project_id'),
    propAnalysis: ctx.json('prop_analysis'),
    authenticatedOnly: optionalBoolean(ctx, 'authenticated_only'),
  }),
});
