import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  projectIdFlag,
} from '../capability-shared.js';

export const queryContextGet = createAnalysisCapabilityCommand({
  resource: 'query-context',
  command: 'get',
  capabilityId: 'analysis.query.context_get',
  description: 'Read full selectable row, column, and metric coordinate options for one source from a synchronous analysis query context.',
  flags: [
    projectIdFlag,
    {
      name: 'query-context-id',
      type: 'string',
      required: true,
      desc: 'query_context_id returned by a synchronous analysis preview.',
    },
    {
      name: 'source',
      type: 'json',
      required: false,
      desc: 'Source selector copied from the compact sources[] summary. Required for multi-source contexts; pass exactly one field: report_id or chart_id.',
    },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    project_id: ctx.num('project-id'),
    query_context_id: ctx.str('query-context-id'),
    source: optionalJson(ctx, 'source'),
  }),
});
