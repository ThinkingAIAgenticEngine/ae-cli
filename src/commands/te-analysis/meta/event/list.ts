import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  directoryLimitFlag,
  fieldsFlag,
  directoryOffsetFlag,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import {
  optionalQueries,
  queriesFlag,
  validateCatalogListFlags,
} from '../../catalog-list.js';

export const metadataEventList = createAnalysisMetaCapabilityCommand({
  resource: 'event',
  command: 'list',
  capabilityId: 'metadata.event.list',
  description: 'List project events with batch keyword search and bounded pagination.',
  flags: [
    projectIdFlag,
    queriesFlag,
    fieldsFlag,
    directoryLimitFlag,
    directoryOffsetFlag,
    { name: 'authenticated-only', type: 'boolean', required: false, desc: 'When true, return only authenticated events.' },
  ],
  risk: 'read',
  validate: validateCatalogListFlags,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    queries: optionalQueries(ctx),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  }),
});
