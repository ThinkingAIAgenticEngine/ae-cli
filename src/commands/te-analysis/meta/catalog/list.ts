import {
  compactInput,
  createAnalysisMetaCapabilityCommand,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import {
  optionalQueries,
  queriesFlag,
  validateCatalogListFlags,
} from '../../catalog-list.js';
import { CliValidationError } from '../../../../core/errors.js';
import type { Flag } from '../../../../framework/types.js';

const resourceTypes = [
  'event',
  'metric',
  'event_property',
  'user_property',
  'cluster',
  'tag',
] as const;

const resourceTypesFlag: Flag = {
  name: 'resource-types',
  type: 'json',
  required: false,
  desc: 'Online search resource type filter JSON array. Use event, metric, event_property, user_property, cluster, or tag.',
};

const limitPerTypeFlag: Flag = {
  name: 'limit-per-type',
  type: 'number',
  required: false,
  min: 1,
  max: 200,
  desc: 'Maximum online search results per resource type. Default: 20, max: 200.',
};

function optionalResourceTypes(
  ctx: Parameters<typeof validateCatalogListFlags>[0],
): string[] | undefined {
  const value = ctx.json('resource-types');
  return value === undefined || value === null ? undefined : value;
}

function validateMetadataCatalogList(
  ctx: Parameters<typeof validateCatalogListFlags>[0],
): void {
  const queries = ctx.json('queries');
  const selectedTypes = ctx.json('resource-types');
  const limitPerType = ctx.optionalNum('limit-per-type');
  validateCatalogListFlags(ctx);
  if (queries === undefined || selectedTypes === undefined) {
    throw new CliValidationError(
      'online catalog search requires --queries and --resource-types',
    );
  }
  if (!Array.isArray(selectedTypes)
    || selectedTypes.length < 1
    || selectedTypes.length > resourceTypes.length
    || selectedTypes.some((type) => typeof type !== 'string'
      || !resourceTypes.includes(type as typeof resourceTypes[number]))) {
    throw new CliValidationError(
      '--resource-types must be a JSON array containing only event, metric, event_property, user_property, cluster, or tag',
    );
  }
}

export const metadataCatalogList = createAnalysisMetaCapabilityCommand({
  resource: 'catalog',
  command: 'list',
  capabilityId: 'metadata.catalog.list',
  description: 'Search selected analysis metadata types with bounded per-type results.',
  flags: [
    projectIdFlag,
    queriesFlag,
    resourceTypesFlag,
    limitPerTypeFlag,
  ],
  risk: 'read',
  validate: validateMetadataCatalogList,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    queries: optionalQueries(ctx),
    resource_types: optionalResourceTypes(ctx),
    limit_per_type: ctx.optionalNum('limit-per-type'),
  }),
});
