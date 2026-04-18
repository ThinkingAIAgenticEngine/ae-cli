import { createMcpCommand, optionalBoolean, optionalJson, optionalJsonString, optionalNumber, optionalString, requiredJsonString } from '../shared.js';

export const getAnalysisQuerySchema = createMcpCommand({
  command: '+get_analysis_query_schema',
  description: 'Get the analysis query schema for the specified model type. Different model types use different query structures and this tool returns field definitions and examples.',
  flags: [
    { name: 'model_type', type: 'string', required: true, desc: 'Model type. Supported values: event, retention, funnel, distribution, sql, interval, path, attribution, prop_analysis, rank_list, heat_map' },
  ],
  risk: 'read',
  buildArgs: (ctx) => ({
    modelType: ctx.str('model_type'),
  }),
});
