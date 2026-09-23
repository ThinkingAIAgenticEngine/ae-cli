import {
  createAnalysisCapabilityCommand,
  compactInput,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalJson,
  optionalNumber,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';
import { queriesFlag, validateQueriesFlag } from '../../catalog-list.js';

const assetTypesFlag = {
  name: 'asset-types',
  type: 'json' as const,
  required: false,
  desc: 'Optional saved analysis asset type narrowing. Omit by default for first-pass asset discovery so dashboards and reports are searched together; pass only when the user explicitly asks for one type or after refining a broad search.',
};

const ownTypesFlag = {
  name: 'own-types',
  type: 'json' as const,
  required: false,
  desc: 'Optional owner filter. CREATED means owned by the current user; SHARED means visible assets created by others.',
};

const requiredQueriesFlag = {
  ...queriesFlag,
  required: true,
  desc: 'Required JSON array of 1 to 20 keyword filters. For first-pass asset discovery, use one broad search without --asset-types and request a large page; when has_more is true and no strong candidate is present, continue with next_offset before narrowing or rewriting keywords.',
};

export const analysisAssetSearch = createAnalysisCapabilityCommand({
  resource: 'asset',
  command: 'search',
  capabilityId: 'analysis.asset.search',
  description: 'Search readable saved analysis assets by keyword, including shared read-only and editable dashboards and reports. Results are ranked before pagination by match quality, certification, recent heat/users, and governance impact. Omit --asset-types for first-pass discovery.',
  flags: [
    projectIdFlag,
    requiredQueriesFlag,
    assetTypesFlag,
    ownTypesFlag,
    directoryLimitFlag,
    directoryOffsetFlag,
  ],
  risk: 'read',
  validate: validateQueriesFlag,
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    queries: optionalJson(ctx, 'queries'),
    asset_types: optionalJson(ctx, 'asset-types'),
    own_types: optionalJson(ctx, 'own-types'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
