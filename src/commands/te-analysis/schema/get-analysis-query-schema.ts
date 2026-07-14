import { createMcpCommand, optionalBoolean, optionalString } from '../shared.js';

export const getAnalysisQuerySchema = createMcpCommand({
  command: '+get_analysis_query_schema',
  description: 'Get the analysis query schema for the SQL manual path. Do not use this tool for natural-language non-SQL ad-hoc analysis; all ten non-SQL models have matching +build_*_analysis_qp commands. Returns field definitions and usage examples for low-level/manual SQL QP construction.',
  flags: [
    { name: 'model_type', type: 'string', required: true, desc: 'Model type. Supported values: event, retention, funnel, distribution, sql, interval, path, attribution, prop_analysis, rank_list, heat_map' },
    { name: 'segments', type: 'string', required: false, desc: 'Schema segments to include (comma-separated). Options: core, filter_group, calctype, aggregatetype, examples, full. Empty/null → core only (recommended).' },
    { name: 'include_core', type: 'boolean', required: false, desc: 'Whether to automatically include core segment. Default: true. Set false for follow-up requests to prevent duplicate core returns.' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    modelType: ctx.str('model_type'),
    segments: optionalString(ctx, 'segments'),
    includeCore: optionalBoolean(ctx, 'include_core'),
  }),
});
