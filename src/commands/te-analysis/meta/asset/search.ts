import {
  createAnalysisMetaCapabilityCommand,
  compactInput,
  directoryLimitFlag,
  directoryOffsetFlag,
  optionalNumber,
  requiredPayloadFlag,
  projectIdFlag,
  projectInput,
} from '../../capability-shared.js';

export const metadataAssetSearch = createAnalysisMetaCapabilityCommand({
  resource: 'asset',
  command: 'search',
  capabilityId: 'metadata.asset.search',
  description: 'Search project assets by keyword.',
  flags: [
    projectIdFlag,
    requiredPayloadFlag,
    directoryLimitFlag,
    directoryOffsetFlag,
  ],
  risk: 'read',
  buildInput: (ctx) => compactInput({
    ...projectInput(ctx),
    payload: ctx.json('payload'),
    limit: optionalNumber(ctx, 'limit'),
    offset: optionalNumber(ctx, 'offset'),
  }),
});
