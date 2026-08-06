import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  directoryLimitFlag,
  fieldsFlag,
  directoryOffsetFlag,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import {
  optionalQueries,
  queriesFlag,
  validateCatalogListFlags,
} from '../../catalog-list.js';

export const metadataPropertyList = createAnalysisMetaCapabilityCommand({
  resource: 'property',
  command: 'list',
  capabilityId: 'metadata.property.list',
  description: 'List event, user, dimension-table, or complex child properties with batch keyword search and bounded pagination.',
  flags: [
    projectIdFlag,
    { name: 'table-type', type: 'string', required: false, desc: 'Optional property table type: event or user.' },
    { name: 'scope', type: 'string', required: false, desc: 'Optional property scope: event or user.' },
    { name: 'event-name', type: 'string', required: false, desc: 'Optional event name filter for event properties.' },
    queriesFlag,
    fieldsFlag,
    directoryLimitFlag,
    directoryOffsetFlag,
    { name: 'authenticated-only', type: 'boolean', required: false, desc: 'When true, return only authenticated properties.' },
  ],
  risk: 'read',
  validate: validateCatalogListFlags,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    table_type: optionalString(ctx, 'table-type'),
    scope: optionalString(ctx, 'scope'),
    event_name: optionalString(ctx, 'event-name'),
    queries: optionalQueries(ctx),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  }),
});
