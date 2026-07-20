import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  fieldsFlag,
  limitFlag,
  offsetFlag,
  optionalBoolean,
  optionalJson,
  optionalNumber,
  optionalString,
  projectIdFlag,
  projectInput,
  queryFlag,
} from '../../capability-shared.js';

export const metadataEventList = createAnalysisMetaCapabilityCommand({
  resource: 'event',
  command: 'list',
  capabilityId: 'metadata.event.list',
  description: 'List project events with optional search, field projection, pagination, and authentication filtering.',
  flags: [
    projectIdFlag,
    queryFlag,
    fieldsFlag,
    limitFlag,
    offsetFlag,
    { name: 'authenticated-only', type: 'boolean', required: false, desc: 'When true, return only authenticated events.' },
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    query: optionalString(ctx, 'query'),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  }),
});
