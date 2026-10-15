import type { RuntimeContext } from '../../../framework/types.js';
import { modelDefinitionIntentSnapshotFlag } from '../../../core/definition-intent.js';
import { reportPresentationFlag, validateReportPresentation } from './presentation.js';
import {
  reportWriteDefinitionFlag,
  reportWriteModelTypeFlag,
  reportMetadataResolutionsFlag,
  validateReportMetadataResolutions,
} from '../ai-models.js';
import {
  compactInput,
  createAnalysisCapabilityCommand,
  optionalJson,
  optionalNumber,
  optionalString,
  optionalStringPreserveEmpty,
  projectIdFlag,
  projectInput,
} from '../capability-shared.js';

function validateReportUpdate(ctx: RuntimeContext): void {
  const hasDefinition = ctx.str('definition') !== '';
  const hasResolutions = ctx.json('resolutions') !== undefined;
  const hasPresentation = ctx.has?.('presentation') ?? ctx.str('presentation') !== '';
  const hasMetadataUpdate = ctx.str('report-name') !== '' || optionalStringPreserveEmpty(ctx, 'report-desc') !== undefined;
  if (!hasDefinition && !hasMetadataUpdate && !hasPresentation) {
    throw new Error('At least one of --report-name, --report-desc, --definition, or --presentation is required.');
  }
  if (hasDefinition && ctx.str('model-type') === '') {
    throw new Error('--model-type is required when --definition is provided.');
  }
  if (hasResolutions && !hasDefinition) {
    throw new Error('--resolutions requires --definition.');
  }
  validateReportMetadataResolutions(ctx);
  validateReportPresentation(ctx);
}

export const reportUpdate = createAnalysisCapabilityCommand({
  resource: 'report',
  command: 'update',
  capabilityId: 'analysis.report.update',
  description: 'Update report metadata, AI QP definition, or event-report presentation through the capability gateway.',
  flags: [
    projectIdFlag,
    { name: 'report-id', type: 'number', required: true, desc: 'Report ID to update.' },
    { name: 'report-version', type: 'number', required: true, desc: 'Current report version from report get.' },
    { name: 'report-name', type: 'string', required: false, desc: 'New report display name.' },
    { name: 'report-desc', type: 'string', required: false, desc: 'New report description. Pass an empty string to clear it; omit to preserve it.' },
    reportWriteModelTypeFlag(false),
    reportWriteDefinitionFlag(false),
    reportPresentationFlag,
    modelDefinitionIntentSnapshotFlag,
    reportMetadataResolutionsFlag,
    { name: 'cache-seconds', type: 'number', required: false, desc: 'Optional cache duration in seconds.' },
    { name: 'query-duration-ms', type: 'number', required: false, desc: 'Optional last query duration in milliseconds.' },
  ],
  risk: 'write',
  validate: validateReportUpdate,
  intentConsistency: { definitionFlag: 'definition', modelTypeFlag: 'model-type' },
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    report_id: ctx.num('report-id'),
    version: ctx.num('report-version'),
    report_name: optionalString(ctx, 'report-name'),
    report_desc: optionalStringPreserveEmpty(ctx, 'report-desc'),
    model_type: optionalString(ctx, 'model-type'),
    definition: optionalJson(ctx, 'definition'),
    presentation: optionalJson(ctx, 'presentation'),
    resolutions: optionalJson(ctx, 'resolutions'),
    cache_seconds: optionalNumber(ctx, 'cache-seconds'),
    query_duration_ms: optionalNumber(ctx, 'query-duration-ms'),
  }),
});
