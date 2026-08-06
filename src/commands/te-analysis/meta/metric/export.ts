import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  fieldsFlag,
  optionalBoolean,
  optionalJson,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import { optionalQueries, queriesFlag } from '../../catalog-list.js';
import {
  metadataExportOutputFlag,
  metadataExportPostProcess,
  validateMetadataExportFlags,
} from '../../metadata-export.js';

export const metadataMetricExport = createAnalysisMetaCapabilityCommand({
  resource: 'metric',
  command: 'export',
  capabilityId: 'metadata.metric.export',
  description: 'Export every matching project metric to one local JSON file without pagination.',
  flags: [
    projectIdFlag,
    { name: 'ignore-authentication', type: 'boolean', required: false, desc: 'Whether to skip asset authentication status decoration.' },
    queriesFlag,
    fieldsFlag,
    { name: 'authenticated-only', type: 'boolean', required: false, desc: 'When true, export only authenticated metrics.' },
    metadataExportOutputFlag,
  ],
  risk: 'read',
  validate: validateMetadataExportFlags,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    ignore_authentication: optionalBoolean(ctx, 'ignore-authentication'),
    queries: optionalQueries(ctx),
    fields: optionalJson(ctx, 'fields'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  }),
  postProcess: metadataExportPostProcess('metric', 'metrics'),
});
