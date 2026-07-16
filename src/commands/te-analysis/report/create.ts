import {
  reportWriteDefinitionFlag,
  reportWriteModelTypeFlag,
} from '../ai-models.js';
import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJsonArray,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

export const reportCreate = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'create',
  capabilityId: 'analysis.report.create',
  description: 'Create an analysis report from an AI QP model_type and definition.',
  flags: [
    projectIdFlag,
    { name: 'report-name', type: 'string', required: true, desc: 'Report display name.' },
    reportWriteModelTypeFlag(true),
    reportWriteDefinitionFlag(true),
    { name: 'report-desc', type: 'string', required: false, desc: 'Optional report description.' },
    { name: 'cache-seconds', type: 'number', required: false, desc: 'Optional cache duration in seconds.' },
    { name: 'query-duration-ms', type: 'number', required: false, desc: 'Optional last query duration in milliseconds.' },
    { name: 'dashboard-ids', type: 'json', required: false, desc: 'Optional dashboard ID array to associate after creation.' },
  ],
  risk: 'write',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    report_name: ctx.str('report-name'),
    model_type: ctx.str('model-type'),
    definition: ctx.json('definition'),
    report_desc: optionalString(ctx, 'report-desc'),
    cache_seconds: optionalNumber(ctx, 'cache-seconds'),
    query_duration_ms: optionalNumber(ctx, 'query-duration-ms'),
    dashboard_ids: optionalJsonArray(ctx, 'dashboard-ids'),
  }),
});
