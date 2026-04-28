import { createMcpCommand, optionalBoolean, optionalString } from '../shared.js';

export const getAnalysisQuerySchema = createMcpCommand({
  command: '+get_analysis_query_schema',
  description: 'Get the analysis query schema for the specified model type. Returns field definitions and usage examples. Core segment contains basic request structure + common CalcType (~13 operators) + common AggregateType (~10 metrics). For most queries, core alone is sufficient.',
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
