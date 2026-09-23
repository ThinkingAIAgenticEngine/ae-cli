import {
  compactInput,
  certificationScopeFlag,
  certificationScopeInput,
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

export const metadataEventExport = createAnalysisMetaCapabilityCommand({
  resource: 'event',
  command: 'export',
  capabilityId: 'metadata.event.export',
  description: 'Export every matching project event to one local JSON file without pagination.',
  flags: [
    projectIdFlag,
    queriesFlag,
    fieldsFlag,
    { name: 'authenticated-only', type: 'boolean', required: false, desc: 'When true, export only authenticated events.' },
    certificationScopeFlag,
    metadataExportOutputFlag,
  ],
  risk: 'read',
  validate: validateMetadataExportFlags,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    queries: optionalQueries(ctx),
    fields: optionalJson(ctx, 'fields'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
    certification_scope: certificationScopeInput(ctx),
  }),
  postProcess: metadataExportPostProcess('event', 'events'),
});
