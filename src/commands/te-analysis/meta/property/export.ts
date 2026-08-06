import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  fieldsFlag,
  optionalBoolean,
  optionalJson,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import { optionalQueries, queriesFlag } from '../../catalog-list.js';
import {
  metadataExportOutputFlag,
  metadataExportPostProcess,
  validateMetadataExportFlags,
} from '../../metadata-export.js';

export const metadataPropertyExport = createAnalysisMetaCapabilityCommand({
  resource: 'property',
  command: 'export',
  capabilityId: 'metadata.property.export',
  description: 'Export every matching property to one local JSON file without pagination.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: false, desc: 'Optional property table type: event or user.' },
    { name: 'scope', type: 'string', required: false, desc: 'Optional property scope: event or user.' },
    { name: 'event-name', type: 'string', required: false, desc: 'Optional event name filter for event properties.' },
    queriesFlag,
    fieldsFlag,
    { name: 'authenticated-only', type: 'boolean', required: false, desc: 'When true, export only authenticated properties.' },
    metadataExportOutputFlag,
  ],
  risk: 'read',
  validate: validateMetadataExportFlags,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    table_type: optionalString(ctx, 'table-type'),
    scope: optionalString(ctx, 'scope'),
    event_name: optionalString(ctx, 'event-name'),
    queries: optionalQueries(ctx),
    fields: optionalJson(ctx, 'fields'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  }),
  postProcess: metadataExportPostProcess('property', 'properties'),
});
