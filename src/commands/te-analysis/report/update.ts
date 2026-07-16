import type { RuntimeContext } from '../../../framework/types.js';
import {
  reportWriteDefinitionFlag,
  reportWriteModelTypeFlag,
} from '../ai-models.js';
import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

function validateReportUpdate(ctx: RuntimeContext): void {
  const hasDefinition = ctx.str('definition') !== '';
  const hasMetadataUpdate = ctx.str('report-name') !== '' || ctx.str('report-desc') !== '';
  if (!hasDefinition && !hasMetadataUpdate) {
    throw new Error('At least one of --report-name, --report-desc, or --definition is required.');
  }
  if (hasDefinition && ctx.str('model-type') === '') {
    throw new Error('--model-type is required when --definition is provided.');
  }
}

export const reportUpdate = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'update',
  capabilityId: 'analysis.report.update',
  description: 'Update report metadata or AI QP definition through the capability gateway.',
  flags: [
    projectIdFlag,
    { name: 'report-id', type: 'number', required: true, desc: 'Report ID to update.' },
    { name: 'report-version', type: 'number', required: true, desc: 'Current report version from report get.' },
    { name: 'report-name', type: 'string', required: false, desc: 'New report display name.' },
    { name: 'report-desc', type: 'string', required: false, desc: 'New report description.' },
    reportWriteModelTypeFlag(false),
    reportWriteDefinitionFlag(false),
    { name: 'cache-seconds', type: 'number', required: false, desc: 'Optional cache duration in seconds.' },
    { name: 'query-duration-ms', type: 'number', required: false, desc: 'Optional last query duration in milliseconds.' },
  ],
  risk: 'write',
  validate: validateReportUpdate,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    report_id: ctx.num('report-id'),
    version: ctx.num('report-version'),
    report_name: optionalString(ctx, 'report-name'),
    report_desc: optionalString(ctx, 'report-desc'),
    model_type: optionalString(ctx, 'model-type'),
    definition: optionalJson(ctx, 'definition'),
    cache_seconds: optionalNumber(ctx, 'cache-seconds'),
    query_duration_ms: optionalNumber(ctx, 'query-duration-ms'),
  }),
});
