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

export const metadataMetricList = createAnalysisMetaCapabilityCommand({
  resource: 'metric',
  command: 'list',
  capabilityId: 'metadata.metric.list',
  description: 'List project metrics with batch keyword search and bounded pagination.',
  flags: [
    projectIdFlag,
    { name: 'ignore-authentication', type: 'boolean', required: false, desc: 'Whether to skip asset authentication status decoration.' },
    queriesFlag,
    fieldsFlag,
    directoryLimitFlag,
    directoryOffsetFlag,
    { name: 'authenticated-only', type: 'boolean', required: false, desc: 'When true, return only authenticated metrics.' },
  ],
  risk: 'read',
  validate: validateCatalogListFlags,
  buildInput: (ctx) => (compactInput({
    ...projectInput(ctx),
    ignore_authentication: optionalBoolean(ctx, 'ignore-authentication'),
    queries: optionalQueries(ctx),
    fields: optionalJson(ctx, 'fields'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
    authenticated_only: optionalBoolean(ctx, 'authenticated-only'),
  })),
});
